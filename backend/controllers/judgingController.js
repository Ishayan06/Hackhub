const Hackathon = require("../models/Hackathon");
const Evaluation = require("../models/Evaluation");
const { startJudging } = require("../services/judging");
const { runWorker } = require("../jobs/evaluationWorker");

const uid = (req) => String(req.user._id || req.user.id);

async function getOwnHackathon(req, res) {
  const h = await Hackathon.findById(req.params.id);
  if (!h) { res.status(404).json({ message: "Hackathon not found" }); return null; }
  if (String(h.maker) !== uid(req)) { res.status(403).json({ message: "Only the maker can do this" }); return null; }
  return h;
}

// GET /api/hackathons/:id/ranking
exports.getRanking = async (req, res, next) => {
  try {
    const h = await Hackathon.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Hackathon not found" });
    const isMaker = String(h.maker) === uid(req);
    if (!isMaker && h.judgingStatus !== "PUBLISHED")
      return res.status(403).json({ message: "Results not published yet" });

    const filter = { hackathon: h._id };
    if (!isMaker) filter.status = "DONE";

    const evals = await Evaluation.find(filter)
      .populate({
        path: "submission",
        populate: { path: "team", select: "name", strictPopulate: false },
      })
      .lean();

    const finalScore = (e) => (e.overrideTotal ?? e.total ?? 0);
    evals.sort(
      (a, b) =>
        finalScore(b) - finalScore(a) ||
        new Date(a.submission?.createdAt || 0) - new Date(b.submission?.createdAt || 0) // tie: pehle submit karne wala
    );

    const ranking = evals.map((e, i) => ({
      rank: i + 1,
      evaluationId: e._id,
      submissionId: e.submission?._id,
      title: e.submission?.title || e.submission?.projectName || e.submission?.name || "Untitled",
      team: e.submission?.team?.name || "",
      total: finalScore(e),
      aiTotal: e.total,
      overridden: e.overrideTotal != null,
      summary: e.summary,
      criteria: e.criteriaScores,
      status: e.status,
      siteMatchesDescription: e.siteMatchesDescription,
      link: e.linkInfo,
      ...(isMaker ? { error: e.error } : {}),
    }));

    res.json({ judgingStatus: h.judgingStatus, ranking });
  } catch (err) { next(err); }
};

// POST /api/hackathons/:id/judge-now  (testing: deadline ka wait nahi)
exports.judgeNow = async (req, res, next) => {
  try {
    const h = await getOwnHackathon(req, res);
    if (!h) return;
    const r = await startJudging(h._id, { force: true });
    if (!r) return res.status(409).json({ message: `Already ${h.judgingStatus}` });
    runWorker(); // background, response block nahi karega
    res.json({ message: "Judging started", submissions: r.count });
  } catch (err) { next(err); }
};

// POST /api/hackathons/:id/publish
exports.publish = async (req, res, next) => {
  try {
    const h = await getOwnHackathon(req, res);
    if (!h) return;
    if (h.judgingStatus !== "RESULTS_READY")
      return res.status(409).json({ message: `Cannot publish while ${h.judgingStatus}` });
    h.judgingStatus = "PUBLISHED";
    await h.save();
    res.json({ message: "Results published" });
  } catch (err) { next(err); }
};

// PATCH /api/hackathons/:id/evaluations/:evalId   body: { total: 0-100 | null }
exports.overrideScore = async (req, res, next) => {
  try {
    const h = await getOwnHackathon(req, res);
    if (!h) return;
    const { total } = req.body;
    if (total !== null && (typeof total !== "number" || total < 0 || total > 100))
      return res.status(400).json({ message: "total must be 0-100 or null" });
    const ev = await Evaluation.findOneAndUpdate(
      { _id: req.params.evalId, hackathon: h._id },
      { overrideTotal: total },
      { new: true }
    );
    if (!ev) return res.status(404).json({ message: "Evaluation not found" });
    res.json(ev);
  } catch (err) { next(err); }
};

// POST /api/hackathons/:id/evaluations/:evalId/retry
exports.retryEvaluation = async (req, res, next) => {
  try {
    const h = await getOwnHackathon(req, res);
    if (!h) return;
    const ev = await Evaluation.findOneAndUpdate(
      { _id: req.params.evalId, hackathon: h._id },
      { status: "PENDING", attempts: 0, retryAt: null, error: "" },
      { new: true }
    );
    if (!ev) return res.status(404).json({ message: "Evaluation not found" });
    if (h.judgingStatus === "RESULTS_READY") {
      h.judgingStatus = "JUDGING";
      await h.save();
    }
    runWorker();
    res.json({ message: "Re-queued" });
  } catch (err) { next(err); }
};