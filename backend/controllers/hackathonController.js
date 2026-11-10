const crypto = require("crypto");
const Hackathon = require("../models/Hackathon");
const Submission = require("../models/Submission");
const Team = require("../models/Team");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion

const generateCode = () => {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
};

const uniqueCode = async () => {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    if (!(await Hackathon.exists({ joinCode: code }))) return code;
  }
  throw new Error("Could not generate a unique join code");
};

const validTeamRange = (min, max) =>
  Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min;

// Map of hackathonId -> number of registered teams
const teamCountMap = async (list) => {
  const rows = await Team.aggregate([
    { $match: { hackathon: { $in: list.map((h) => h._id) } } },
    { $group: { _id: "$hackathon", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

// Shapes a hackathon for the client. joinCode + participant list only for the owner.
const serialize = (h, user, teamCount = 0) => {
  const obj = h.toObject ? h.toObject() : h;
  const isOwner = user && String(obj.maker._id || obj.maker) === String(user._id);
  const isJoined =
    !!user &&
    obj.participants.some((p) => String(p.user._id || p.user) === String(user._id));

  const out = {
    ...obj,
    id: obj._id,
    participantCount: obj.participants.length,
    teamCount,
    isOwner: !!isOwner,
    isJoined,
  };
  delete out.__v;
  if (!isOwner) delete out.joinCode;
  if (!isOwner) delete out.participants;
  return out;
};

exports.createHackathon = async (req, res, next) => {
  try {
    const {
      title, description, theme, mode, location, prize, tags,
      startDate, endDate,
    } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ message: "title, description, startDate and endDate are required" });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: "endDate must be after startDate" });
    }

    const minTeamSize = Number(req.body.minTeamSize ?? 1);
    const maxTeamSize = Number(req.body.maxTeamSize ?? 4);
    if (!validTeamRange(minTeamSize, maxTeamSize)) {
      return res.status(400).json({ message: "Invalid team size range" });
    }

    const maxTeams = Number(req.body.maxTeams ?? 0);
    if (!Number.isInteger(maxTeams) || maxTeams < 0) {
      return res.status(400).json({ message: "Invalid max teams" });
    }

    const hackathon = await Hackathon.create({
      title,
      description,
      theme,
      mode,
      location,
      prize,
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      maxTeams,
      minTeamSize,
      maxTeamSize,
      startDate,
      endDate,
      joinCode: await uniqueCode(),
      maker: req.user._id,
    });

    await hackathon.populate("maker", "name email");
    res.status(201).json({ hackathon: serialize(hackathon, req.user, 0) });
  } catch (err) {
    next(err);
  }
};

// Public list of all hackathons (no join codes). Supports ?q= & ?status=
exports.listHackathons = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { theme: rx }, { tags: rx }];
    }
    const now = new Date();
    if (status === "upcoming") filter.startDate = { $gt: now };
    if (status === "live") Object.assign(filter, { startDate: { $lte: now }, endDate: { $gte: now } });
    if (status === "ended") filter.endDate = { $lt: now };

    const list = await Hackathon.find(filter)
      .sort({ startDate: -1 })
      .populate("maker", "name");

    const counts = await teamCountMap(list);
    res.json({
      hackathons: list.map((h) => serialize(h, req.user, counts.get(String(h._id)) || 0)),
    });
  } catch (err) {
    next(err);
  }
};

exports.getHackathon = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id)
      .populate("maker", "name email")
      .populate("participants.user", "name email");
    if (!h) return res.status(404).json({ message: "Hackathon not found" });

    const teamCount = await Team.countDocuments({ hackathon: h._id });
    const data = serialize(h, req.user, teamCount);
    let mySubmission = null;
    if (req.user && data.isJoined) {
      mySubmission = await Submission.findOne({ hackathon: h._id, participant: req.user._id });
    }
    res.json({ hackathon: data, mySubmission });
  } catch (err) {
    next(err);
  }
};

// Maker => hackathons they created. Participant => hackathons they joined.
exports.myHackathons = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "maker"
        ? { maker: req.user._id }
        : { "participants.user": req.user._id };
    const list = await Hackathon.find(filter).sort({ startDate: -1 }).populate("maker", "name");
    const counts = await teamCountMap(list);
    res.json({
      hackathons: list.map((h) => serialize(h, req.user, counts.get(String(h._id)) || 0)),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateHackathon = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    if (String(h.maker) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can edit this hackathon" });
    }

    const fields = [
      "title", "description", "theme", "mode", "location", "prize", "tags",
      "maxTeams", "minTeamSize", "maxTeamSize", "startDate", "endDate",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) h[f] = req.body[f];
    });

    h.minTeamSize = Number(h.minTeamSize);
    h.maxTeamSize = Number(h.maxTeamSize);
    if (!validTeamRange(h.minTeamSize, h.maxTeamSize)) {
      return res.status(400).json({ message: "Invalid team size range" });
    }
    if (h.endDate <= h.startDate) {
      return res.status(400).json({ message: "endDate must be after startDate" });
    }

    h.maxTeams = Number(h.maxTeams) || 0;
    const existing = await Team.countDocuments({ hackathon: h._id });
    if (h.maxTeams > 0 && h.maxTeams < existing) {
      return res.status(400).json({ message: `${existing} teams already registered; max teams can't be lower` });
    }

    await h.save();
    await h.populate("maker", "name email");
    res.json({ hackathon: serialize(h, req.user, existing) });
  } catch (err) {
    next(err);
  }
};

exports.deleteHackathon = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    if (String(h.maker) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can delete this hackathon" });
    }
    await Submission.deleteMany({ hackathon: h._id });
    await Team.deleteMany({ hackathon: h._id });
    await h.deleteOne();
    res.json({ message: "Hackathon deleted" });
  } catch (err) {
    next(err);
  }
};

// Participant joins using the private code
exports.joinByCode = async (req, res, next) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ message: "Join code is required" });

    const h = await Hackathon.findOne({ joinCode: code });
    if (!h) return res.status(404).json({ message: "Invalid join code" });

    if (new Date() > h.endDate) {
      return res.status(400).json({ message: "This hackathon has already ended" });
    }
    if (h.participants.some((p) => String(p.user) === String(req.user._id))) {
      return res.status(409).json({ message: "You have already joined this hackathon", hackathonId: h._id });
    }

    h.participants.push({ user: req.user._id });
    await h.save();
    res.json({ message: "Joined successfully", hackathonId: h._id, title: h.title });
  } catch (err) {
    next(err);
  }
};

exports.leaveHackathon = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    h.participants = h.participants.filter((p) => String(p.user) !== String(req.user._id));
    await h.save();
    await Submission.deleteOne({ hackathon: h._id, participant: req.user._id });
    res.json({ message: "You left the hackathon" });
  } catch (err) {
    next(err);
  }
};