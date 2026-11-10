const crypto = require("crypto");
const Hackathon = require("../models/Hackathon");
const Team = require("../models/Team");

const isJoined = (h, uid) => h.participants.some((p) => String(p.user) === String(uid));

// NEW: phone helpers. "+91 98765-43210" -> "9876543210"
const PHONE_RE = /^[6-9]\d{9}$/;
const cleanPhone = (p) =>
  String(p || "")
    .replace(/[\s\-()]/g, "")
    .replace(/^(\+91|91|0)(?=\d{10}$)/, "");

exports.createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Team name required" });

    const h = await Hackathon.findById(req.params.hid);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    if (!isJoined(h, req.user._id))
      return res.status(403).json({ message: "Join the hackathon first" });

    if (await Team.exists({ hackathon: h._id, members: req.user._id }))
      return res.status(409).json({ message: "You are already in a team" });

    // NEW: max teams limit (0 = unlimited)
    if (h.maxTeams > 0 && (await Team.countDocuments({ hackathon: h._id })) >= h.maxTeams) {
      return res.status(400).json({ message: `Team registration is full (max ${h.maxTeams} teams)` });
    }

    // NEW: validate name + phone of each individual (first row = leader)
    const raw = Array.isArray(req.body.members) ? req.body.members : [];
    const memberDetails = raw.map((m, i) => ({
      name: String(m?.name || "").trim(),
      phone: cleanPhone(m?.phone),
      isLeader: i === 0,
    }));

    if (memberDetails.length < 1)
      return res.status(400).json({ message: "Add at least the leader's name and phone" });
    if (memberDetails.length > h.maxTeamSize)
      return res.status(400).json({ message: `Team can have at most ${h.maxTeamSize} members` });

    for (const [i, m] of memberDetails.entries()) {
      if (!m.name) return res.status(400).json({ message: `Member ${i + 1}: name is required` });
      if (!PHONE_RE.test(m.phone))
        return res.status(400).json({ message: `Member ${i + 1}: enter a valid 10-digit phone number` });
    }
    if (new Set(memberDetails.map((m) => m.phone)).size !== memberDetails.length)
      return res.status(400).json({ message: "Each member needs a different phone number" });

    const team = await Team.create({
      hackathon: h._id,
      name: name.trim(),
      leader: req.user._id,
      members: [req.user._id],
      memberDetails, // NEW
      inviteCode: crypto.randomBytes(4).toString("hex"),
    });
    res.status(201).json(team);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Team name already taken" });
    res.status(500).json({ message: "Server error" });
  }
};

exports.joinTeam = async (req, res) => {
  try {
    const code = String(req.body.inviteCode || "").trim();
    const team = await Team.findOne({ inviteCode: code });
    if (!team) return res.status(404).json({ message: "Invalid invite code" });

    const h = await Hackathon.findById(team.hackathon);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    if (!isJoined(h, req.user._id))
      return res.status(403).json({ message: "Join this hackathon first, then join the team" });

    if (await Team.exists({ hackathon: team.hackathon, members: req.user._id }))
      return res.status(409).json({ message: "You are already in a team for this hackathon" });

    // NEW: leader may already have registered a full roster
    if (team.memberDetails.length >= h.maxTeamSize)
      return res.status(400).json({ message: `Team is full (max ${h.maxTeamSize})` });

    // atomic: only pushes if there's still a free slot
    const updated = await Team.findOneAndUpdate(
      { _id: team._id, [`members.${h.maxTeamSize - 1}`]: { $exists: false } },
      { $push: { members: req.user._id } },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: `Team is full (max ${h.maxTeamSize})` });

    res.json({ message: "Joined", teamId: updated._id });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !team.members.some((m) => m.equals(req.user._id)))
      return res.status(400).json({ message: "You are not in this team" });

    team.members.pull(req.user._id);
    if (team.members.length === 0) {
      await team.deleteOne();
    } else {
      if (team.leader.equals(req.user._id)) team.leader = team.members[0];
      await team.save();
    }
    res.json({ message: "Left team" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const uid = String(req.user._id);
    const h = await Hackathon.findById(req.params.hid).select("minTeamSize maxTeamSize maxTeams");
    if (!h) return res.status(404).json({ message: "Hackathon not found" });

    const teams = await Team.find({ hackathon: h._id }).populate("members", "name");
    res.json({
      minTeamSize: h.minTeamSize,
      maxTeamSize: h.maxTeamSize,
      maxTeams: h.maxTeams,
      teamCount: teams.length,
      teamsFull: h.maxTeams > 0 && teams.length >= h.maxTeams,
      teams: teams.map((t) => {
        const isMine = t.members.some((m) => String(m._id) === uid);
        const size = Math.max(t.members.length, t.memberDetails.length); // NEW
        return {
          _id: t._id,
          name: t.name,
          size,
          members: t.members.map((m) => ({ _id: m._id, name: m.name })),
          meetsMinimum: size >= h.minTeamSize,
          isMine,
          isLeader: String(t.leader) === uid, // NEW
          inviteCode: isMine ? t.inviteCode : undefined, // only own team sees the code
          memberDetails: isMine ? t.memberDetails : undefined, // NEW: phones stay private
        };
      }),
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};