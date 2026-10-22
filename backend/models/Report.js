const mongoose = require("mongoose");

const ParameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed }, // Can be number or string
  unit: { type: String, default: "" },
  reference_range: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["normal", "high", "low", "warning"], 
    default: "normal" 
  },
  explanation: { type: String, default: "" }
});

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    patientName: {
      type: String,
      default: "Patient"
    },
    reportDate: {
      type: Date,
      default: Date.now
    },
    summary: {
      type: String,
      default: ""
    },
    parameters: [ParameterSchema],
    lifestyleRecommendations: [{ type: String }],
    rawText: {
      type: String,
      default: ""
    },
    chatHistory: [ChatMessageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
