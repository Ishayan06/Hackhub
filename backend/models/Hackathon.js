const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 4000 },
    theme: { type: String, trim: true, default: "Open Innovation" },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    location: { type: String, trim: true, default: "" },
    prize: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    maxTeams: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    minTeamSize: { type: Number, default: 1, min: 1 },
    maxTeamSize: { type: Number, default: 4, min: 1 },
    // Participants join privately using this code
    joinCode: { type: String, required: true, unique: true, uppercase: true },
    // AI judging
    aiJudging: { type: Boolean, default: false},
    judgingStatus: {
      type: String,
      enum: ["OPEN", "JUDGING", "RESULTS_READY", "PUBLISHED"],
      default: "OPEN",
    },
    rubric: {
      type: [
        {
          name: { type: String, required: true },
          weight: { type: Number, required: true }, // total 100
          description: { type: String, default: "" },
        },
      ],
      default: [
        {
          name: "Innovation",
          weight: 25,
          description: "Originality of the idea",
        },
        {
          name: "Technical Complexity",
          weight: 25,
          description: "Depth of implementation",
        },
        {
          name: "Completeness",
          weight: 20,
          description: "Working demo, features done",
        },
        {
          name: "Problem-Solution Fit",
          weight: 20,
          description: "Solves a real problem",
        },
        { name: "UI/UX", weight: 10, description: "Usability and design" },
      ],
    },
    maker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// maxTeamSize must never be smaller than minTeamSize
hackathonSchema.pre("validate", function (next) {
  if (this.maxTeamSize < this.minTeamSize) {
    this.invalidate("maxTeamSize", "maxTeamSize must be >= minTeamSize");
  }
  next();
});

hackathonSchema.virtual("status").get(function () {
  const now = new Date();
  if (now < this.startDate) return "upcoming";
  if (now > this.endDate) return "ended";
  return "live";
});

hackathonSchema.set("toJSON", { virtuals: true });
hackathonSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Hackathon", hackathonSchema);
