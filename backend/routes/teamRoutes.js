const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const t = require("../controllers/teamController");

// Teams of a hackathon
router.get("/hackathons/:hid/teams", protect, t.getTeams);
router.post("/hackathons/:hid/teams", protect, requireRole("participant"), t.createTeam);

// Join / leave
router.post("/teams/join", protect, requireRole("participant"), t.joinTeam);
router.post("/teams/:id/leave", protect, requireRole("participant"), t.leaveTeam);

module.exports = router;