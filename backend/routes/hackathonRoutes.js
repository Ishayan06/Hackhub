const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const h = require("../controllers/hackathonController");
const s = require("../controllers/submissionController");

// Static paths first so they don't get swallowed by "/:id"
router.get("/mine", protect, h.myHackathons);
router.post("/join", protect, requireRole("participant"), h.joinByCode);

router.get("/", optionalAuth, h.listHackathons);
router.post("/", protect, requireRole("maker"), h.createHackathon);

router.get("/:id", optionalAuth, h.getHackathon);
router.put("/:id", protect, requireRole("maker"), h.updateHackathon);
router.delete("/:id", protect, requireRole("maker"), h.deleteHackathon);
router.post("/:id/leave", protect, requireRole("participant"), h.leaveHackathon);

// Submissions
router.post("/:id/submissions", protect, requireRole("participant"), s.submitProject);
router.get("/:id/submissions", protect, requireRole("maker"), s.listSubmissions);
router.patch("/:id/submissions/:submissionId", protect, requireRole("maker"), s.scoreSubmission);

module.exports = router;
