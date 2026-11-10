const Hackathon = require("../models/Hackathon");
const Submission = require("../models/Submission");
const Team = require("../models/Team");

// Participant: create or update own submission for a hackathon they joined
exports.submitProject = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });

    const joined = h.participants.some((p) => String(p.user) === String(req.user._id));
    if (!joined) return res.status(403).json({ message: "Join the hackathon first" });

    const now = new Date();
    if (now < h.startDate) return res.status(400).json({ message: "Hackathon has not started yet" });
    if (now > h.endDate) return res.status(400).json({ message: "Submissions are closed" });

    // ---- Team size check ----
    const minSize = h.minTeamSize || 1;
    const team = await Team.findOne({ hackathon: h._id, members: req.user._id });

    if (!team && minSize > 1) {
      return res
        .status(400)
        .json({ message: `Create or join a team first (min ${minSize} members required)` });
    }
    if (team && team.members.length < minSize) {
      return res.status(400).json({
        message: `Your team needs at least ${minSize} members (currently ${team.members.length})`,
      });
    }
    // -------------------------

    const { title, description, repoUrl, demoUrl } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "title and description are required" });
    }

    const submission = await Submission.findOneAndUpdate(
      { hackathon: h._id, participant: req.user._id },
      { title, description, repoUrl: repoUrl || "", demoUrl: demoUrl || "" },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ submission });
  } catch (err) {
    next(err);
  }
};

// Maker (owner): all submissions for their hackathon
exports.listSubmissions = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    if (String(h.maker) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can view submissions" });
    }
    const submissions = await Submission.find({ hackathon: h._id })
      .populate("participant", "name email")
      .sort({ score: -1, createdAt: 1 });
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
};

// Maker (owner): score + feedback
exports.scoreSubmission = async (req, res, next) => {
  try {
    const sub = await Submission.findById(req.params.submissionId).populate("hackathon");
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (String(sub.hackathon.maker) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can score submissions" });
    }

    const { score, feedback } = req.body;
    if (score !== undefined) {
      const n = Number(score);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return res.status(400).json({ message: "score must be between 0 and 100" });
      }
      sub.score = n;
    }
    if (feedback !== undefined) sub.feedback = feedback;
    await sub.save();
    res.json({ submission: sub });
  } catch (err) {
    next(err);
  }
};