const mongoose = require("mongoose");

// NEW: name + phone of every individual, entered by the leader
const memberDetailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"],
    },
    isLeader: { type: Boolean, default: false },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    name: { type: String, required: true, trim: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    memberDetails: { type: [memberDetailSchema], default: [] }, // NEW
    inviteCode: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

teamSchema.index({ hackathon: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Team", teamSchema);