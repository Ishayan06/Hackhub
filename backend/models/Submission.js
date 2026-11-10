const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 3000 },
    repoUrl: { type: String, trim: true, default: "" },
    demoUrl: { type: String, trim: true, default: "" },
    score: { type: Number, min: 0, max: 100, default: null },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

// One submission per participant per hackathon (resubmitting updates it)
submissionSchema.index({ hackathon: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
