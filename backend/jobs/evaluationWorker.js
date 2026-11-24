const Evaluation = require("../models/Evaluation");
const Submission = require("../models/Submission");
const Hackathon = require("../models/Hackathon");
const { getFields } = require("../services/submissionFields");
const { fetchPage } = require("../services/scraper");
const { scoreProject } = require("../services/aiJudge");

const MAX_ATTEMPTS = 3;
const CONCURRENCY = 2; // Groq free-tier rate limit ke liye kam rakho
let running = false;

const claim = () =>
  Evaluation.findOneAndUpdate(
    { status: "PENDING", $or: [{ retryAt: null }, { retryAt: { $lte: new Date() } }] },
    { status: "PROCESSING" },
    { new: true }
  );

async function maybeFinalize(hackathonId) {
  const open = await Evaluation.countDocuments({
    hackathon: hackathonId,
    status: { $in: ["PENDING", "PROCESSING"] },
  });
  if (open === 0) {
    await Hackathon.updateOne(
      { _id: hackathonId, judgingStatus: "JUDGING" },
      { judgingStatus: "RESULTS_READY" }
    );
  }
}

async function processOne(ev) {
  try {
    const [sub, hack] = await Promise.all([
      Submission.findById(ev.submission).lean(),
      Hackathon.findById(ev.hackathon), // non-lean: purane docs ko rubric default mil jata hai
    ]);
    if (!sub || !hack) throw new Error("Submission or hackathon not found");

    const fields = getFields(sub);
    const page = fields.url ? await fetchPage(fields.url) : { live: false, error: "No URL submitted" };
    const result = await scoreProject({ hackathon: hack, fields, page });

    ev.criteriaScores = result.criteria;
    ev.total = result.total;
    ev.summary = result.summary;
    ev.siteMatchesDescription = result.siteMatchesDescription;
    ev.linkInfo = { live: !!page.live, status: page.status, responseMs: page.responseMs, error: page.error };
    ev.status = "DONE";
    ev.error = "";
    await ev.save();
  } catch (err) {
    ev.attempts += 1;
    ev.error = err.message;
    if (ev.attempts >= MAX_ATTEMPTS) {
      ev.status = "NEEDS_MANUAL_REVIEW";
    } else {
      ev.status = "PENDING";
      ev.retryAt = new Date(Date.now() + 30000 * ev.attempts); // backoff
    }
    await ev.save();
    console.error(`Evaluation ${ev._id} failed (attempt ${ev.attempts}):`, err.message);
  }
  await maybeFinalize(ev.hackathon);
}

exports.runWorker = async function runWorker() {
  if (running) return;
  running = true;
  try {
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        let ev;
        while ((ev = await claim())) await processOne(ev);
      })
    );
  } finally {
    running = false;
  }
};

// server restart me atke hue jobs wapas queue me
exports.resetStuck = () => Evaluation.updateMany({ status: "PROCESSING" }, { status: "PENDING" });