const express = require("express");
const router = express.Router();
// apne auth middleware ka sahi naam/path yaha daalo
const { protect } = require("../middleware/auth");
const c = require("../controllers/judgingController");

router.get("/:id/ranking", protect, c.getRanking);
router.post("/:id/judge-now", protect, c.judgeNow);
router.post("/:id/publish", protect, c.publish);
router.patch("/:id/evaluations/:evalId", protect, c.overrideScore);
router.post("/:id/evaluations/:evalId/retry", protect, c.retryEvaluation);

module.exports = router;