const mongoose = require("mongoose");

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    chatRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
    uploads: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("AIUsage", aiUsageSchema);
