const cron = require("node-cron");
const Hackathon = require("../models/Hackathon");
const Submission = require("../models/Submission");
const Evaluation = require("../models/Evaluation");

cron.schedule("* * * * *", async () => {
  try {
    while (true) {
      // atomic claim: ek hackathon sirf ek baar JUDGING me jayega
      const h = await Hackathon.findOneAndUpdate(
        {
          endDate: { $lt: new Date() },
          judgingStatus: { $in: ["OPEN", null] }, // null = purane docs jinme field nahi hai
          aiJudging: { $ne: false },
        },
        { judgingStatus: "JUDGING" },
        { new: true }
      );
      if (!h) break;

      const subs = await Submission.find({ hackathon: h._id }).select("_id");
      await Evaluation.insertMany(
        subs.map((s) => ({ submission: s._id, hackathon: h._id })),
        { ordered: false }
      ).catch(() => {}); // duplicate ignore

      console.log(`Judging started: ${h.title} (${subs.length} submissions)`);
      // TODO: yaha evaluation worker trigger hoga (next step)
    }
  } catch (err) {
    console.error("deadlineJob error:", err);
  }
});