const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    submission: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", unique: true },
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", index: true },
    criteriaScores: [{ name: String, score: Number, reason: String }], // score 0-10
    total: { type: Number, default: 0 },          // 0-100, weighted
    overrideTotal: { type: Number, default: null }, // maker override
    summary: { type: String, default: "" },
    siteMatchesDescription: { type: Boolean, default: null },
    linkInfo: { live: Boolean, status: Number, responseMs: Number, error: String },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "DONE", "NEEDS_MANUAL_REVIEW"],
      default: "PENDING",
    },
    attempts: { type: Number, default: 0 },
    retryAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evaluation", evaluationSchema);