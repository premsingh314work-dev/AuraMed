const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const auth = require("../middleware/auth");
const Report = require("../models/Report");
const mongoose = require("mongoose");
const { uploadLimiter, chatLimiter } = require("../middleware/rateLimiters");
const {
  chatUsageLimiter,
  uploadUsageLimiter,
  validateChatQuestion,
} = require("../middleware/aiUsageQuota");

// Configure Multer for in-memory file uploads

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://127.0.0.1:8000";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadSingleReport = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message:
            "File too large. Please upload a PDF or image smaller than 2 MB.",
          maxSizeMB: 2,
        });
      }

      return res.status(400).json({
        message: "Unable to process the uploaded file.",
        detail: err.message,
      });
    }

    if (err) {
      return next(err);
    }

    next();
  });
};

// @route   POST api/reports/upload
// @desc    Upload a report, parse it via AI backend, and save to DB
// @access  Private
router.post(
  "/upload",
  auth,
  uploadLimiter,
  uploadSingleReport,
  uploadUsageLimiter,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      // 1. Prepare form-data to forward to FastAPI AI Backend
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // 2. Call FastAPI analyze endpoint
      console.log(
        `Forwarding file ${req.file.originalname} to FastAPI AI backend...`,
      );
      const aiResponse = await axios.post(
        `${AI_BACKEND_URL}/analyze`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      const { fileName, rawText, analysis } = aiResponse.data;

      // 3. Save structured analysis to MongoDB
      const newReport = new Report({
        userId: req.user.id,
        fileName: fileName,
        patientName: req.body.patientName || "Patient",
        reportDate: req.body.reportDate
          ? new Date(req.body.reportDate)
          : new Date(),
        summary: analysis.summary || "",
        parameters: analysis.parameters || [],
        lifestyleRecommendations: analysis.lifestyle_recommendations || [],
        rawText: rawText || "",
        chatHistory: [],
      });

      const savedReport = await newReport.save();
      res.status(201).json(savedReport);
    } catch (err) {
      console.error("Error uploading/analyzing report:", err.message);
      if (err.response) {
        // Axios error with response from FastAPI
        return res.status(err.response.status).json({
          message: "AI Backend Error",
          detail: err.response.data.detail || err.response.statusText,
        });
      }
      res.status(500).json({ message: "Server error", detail: err.message });
    }
  },
);

// @route   GET api/reports
// @desc    Get all reports for current user (lightweight)
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id })
      .select("-rawText -chatHistory")
      .sort({ reportDate: -1, createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/reports/trends
// @desc    Get historical parameters over time for graphing
// @access  Private
router.get("/trends", auth, async (req, res) => {
  try {
    // Get all reports sorted chronologically
    const reports = await Report.find({ userId: req.user.id })
      .select("reportDate parameters")
      .sort({ reportDate: 1 });

    // Format trends data for Recharts:
    // [{ date: '2026-08-01', 'Hemoglobin': 12.5, 'Glucose': 95 }, ...]
    const trendMap = {};

    reports.forEach((report) => {
      const dateStr = report.reportDate.toISOString().split("T")[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: dateStr };
      }

      report.parameters.forEach((param) => {
        // Try to parse value as number if possible
        const parsedVal = parseFloat(param.value);
        if (!isNaN(parsedVal)) {
          trendMap[dateStr][param.name] = parsedVal;
        }
      });
    });

    const trendData = Object.values(trendMap);
    res.json(trendData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/reports/compare
// @desc    Compare reports side-by-side
// @access  Private

// @route GET /api/reports/compare?ids=id1,id2
// @desc Compare 2–3 reports belonging to the logged-in user
// @access Private
router.get("/compare", auth, async (req, res) => {
  const rawIds = req.query.ids;

  if (typeof rawIds !== "string" || !rawIds.trim()) {
    return res.status(400).json({
      message: "Please select at least two reports to compare.",
    });
  }

  const ids = rawIds.split(",").map((id) => id.trim());

  if (ids.length < 2 || ids.length > 3) {
    return res.status(400).json({
      message: "You can compare between 2 and 3 reports.",
    });
  }

  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    return res.status(400).json({
      message: "One or more report IDs are invalid.",
    });
  }

  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({
      message: "Please select different reports for comparison.",
    });
  }

  try {
    const reports = await Report.find({
      _id: { $in: ids },
      userId: req.user.id,
    })
      .select("fileName patientName reportDate createdAt summary parameters")
      .lean();

    // Never silently compare only part of the requested selection.
    if (reports.length !== ids.length) {
      return res.status(404).json({
        message: "One or more reports were not found or cannot be accessed.",
      });
    }

    // Oldest to newest; createdAt breaks ties.
    reports.sort((a, b) => {
      const dateDifference =
        new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();

      if (dateDifference !== 0) return dateDifference;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return res.json(reports);
  } catch (error) {
    console.error("Report comparison failed:", error.message);

    return res.status(500).json({
      message: "Unable to compare reports right now.",
    });
  }
});

router.post("/compare/summary", auth, async (req, res) => {
  try {
    const { reportIds } = req.body;

    // Validate the requested report IDs.
    if (
      !Array.isArray(reportIds) ||
      reportIds.length < 2 ||
      reportIds.length > 3
    ) {
      return res.status(400).json({
        message: "Select between 2 and 3 reports.",
      });
    }

    if (
      reportIds.some(
        (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
      )
    ) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    if (new Set(reportIds).size !== reportIds.length) {
      return res.status(400).json({
        message: "Duplicate report IDs are not allowed.",
      });
    }

    // Fetch only reports belonging to the authenticated user.
    const reports = await Report.find({
      _id: { $in: reportIds },
      userId: req.user.id,
    })
      .select("fileName reportDate createdAt parameters")
      .lean();

    if (reports.length !== reportIds.length) {
      return res.status(404).json({
        message: "One or more reports were not found.",
      });
    }

    // Preserve the order of the IDs sent by the frontend.
    const reportMap = new Map(
      reports.map((report) => [String(report._id), report]),
    );

    const orderedReports = reportIds.map((id) => {
      const report = reportMap.get(id);

      return {
        fileName: report.fileName,
        reportDate: report.reportDate || report.createdAt,
        parameters: report.parameters || [],
      };
    });

    // Call your existing FastAPI AI backend.
    const aiServiceUrl = process.env.AI_BACKEND_URL;

    if (!aiServiceUrl) {
      throw new Error("AI_BACKEND_URL is not configured");
    }

    const aiResponse = await axios.post(
      `${aiServiceUrl}/compare-summary`,
      { reports: orderedReports },
      { timeout: 60000 },
    );

    return res.json(aiResponse.data);
  } catch (error) {
    console.error(
      "Comparison summary error:",
      error.response?.data || error.message,
    );

    return res.status(502).json({
      message: "Could not generate the comparison summary.",
    });
  }
});

// @route   GET api/reports/:id
// @desc    Get details and chat history for a specific report
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    res.json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/reports/:id/chat
// @desc    Ask a question about a report and save to chat history
// @access  Private
router.post(
  "/:id/chat",
  auth,
  chatLimiter,
  validateChatQuestion,
  chatUsageLimiter,
  async (req, res) => {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Please enter a question." });
    }

    try {
      const report = await Report.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!report) {
        return res.status(404).json({ message: "Report not found." });
      }

      // Call FastAPI chat endpoint
      const chatPayload = {
        question: question,
        report_data: {
          summary: report.summary,
          parameters: report.parameters,
          lifestyle_recommendations: report.lifestyleRecommendations,
        },
        chat_history: report.chatHistory.map((ch) => ({
          role: ch.role,
          content: ch.content,
        })),
      };

      console.log(
        `Sending question for report ${report.fileName} to FastAPI chat backend...`,
      );
      const aiResponse = await axios.post(
        `${AI_BACKEND_URL}/chat`,
        chatPayload,
      );
      const answer = aiResponse.data.answer;

      // Append to report chat history
      report.chatHistory.push({ role: "user", content: question });
      report.chatHistory.push({ role: "assistant", content: answer });
      await report.save();

      res.json({
        question,
        answer,
        chatHistory: report.chatHistory,
      });
    } catch (err) {
      console.error("Chat Explainer Error:", err.message);
      if (err.response) {
        return res.status(err.response.status).json({
          message: "AI Chat Error",
          detail: err.response.data.detail || err.response.statusText,
        });
      }
      res.status(500).json({ message: "Server error", detail: err.message });
    }
  },
);

// @route   DELETE api/reports/:id
// @desc    Delete a report
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await Report.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Report not found or unauthorized." });
    }
    res.json({ message: "Report deleted successfully." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
