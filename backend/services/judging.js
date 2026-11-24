const Hackathon = require("../models/Hackathon");
const Submission = require("../models/Submission");
const Team = require("../models/Team");
const Evaluation = require("../models/Evaluation");

async function findSubmissions(hackathonId) {
  // guard: unknown field pe filter lagane se Mongoose 6 saari submissions de deta hai
  if (Submission.schema.path("hackathon")) {
    return Submission.find({ hackathon: hackathonId }).select("_id").lean();
  }
  const teams = await Team.find({ hackathon: hackathonId }).select("_id").lean();
  return Submission.find({ team: { $in: teams.map((t) => t._id) } }).select("_id").lean();
}

// force=true => deadline ka wait nahi (testing / maker "judge now")
exports.startJudging = async function startJudging(hackathonId, { force = false } = {}) {
  const filter = { _id: hackathonId, judgingStatus: { $in: ["OPEN", null] } };
  if (!force) {
    filter.endDate = { $lt: new Date() };
    filter.aiJudging = true;
  }
  // atomic claim: ek hackathon sirf ek baar JUDGING me jayega
  const h = await Hackathon.findOneAndUpdate(
    filter,
    { judgingStatus: "JUDGING", aiJudging: true },
    { new: true }
  );
  if (!h) return null;

  const subs = await findSubmissions(h._id);
  if (!subs.length) {
    await Hackathon.updateOne({ _id: h._id }, { judgingStatus: "RESULTS_READY" });
    return { hackathon: h, count: 0 };
  }
  await Evaluation.insertMany(
    subs.map((s) => ({ submission: s._id, hackathon: h._id })),
    { ordered: false }
  ).catch(() => {}); // duplicates ignore
  return { hackathon: h, count: subs.length };
};