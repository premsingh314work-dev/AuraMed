const AIUsage = require("../models/AIUsage");

function readLimit(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const CHAT_DAILY_LIMIT = readLimit("AI_CHAT_DAILY_LIMIT", 50);
const UPLOAD_DAILY_LIMIT = readLimit("AI_UPLOAD_DAILY_LIMIT", 10);

function getUtcDay() {
  return new Date().toISOString().slice(0, 10);
}

function getNextUtcMidnight() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

async function consumeQuota(userId, field, limit) {
  const day = getUtcDay();

  // Ensure the daily document exists.
  try {
    await AIUsage.updateOne(
      { userId, day },
      {
        $setOnInsert: {
          userId,
          day,
          chatRequests: 0,
          uploads: 0,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Another simultaneous request may have created it first.
    if (error.code !== 11000) {
      throw error;
    }
  }

  // Increment only when the current count is below the limit.
  return AIUsage.findOneAndUpdate(
    {
      userId,
      day,
      [field]: { $lt: limit },
    },
    {
      $inc: { [field]: 1 },
    },
    { new: true },
  );
}

function createQuotaLimiter(field, limit, label) {
  return async function (req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Authentication required.",
        });
      }

      const usage = await consumeQuota(req.user.id, field, limit);

      if (!usage) {
        const resetAt = getNextUtcMidnight();

        res.set(
          "Retry-After",
          String(
            Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
          ),
        );

        return res.status(429).json({
          message: `Daily ${label} limit reached.`,
          limit,
          period: "UTC day",
          resetsAt: resetAt.toISOString(),
        });
      }

      res.set("X-AI-Quota-Limit", String(limit));
      res.set("X-AI-Quota-Remaining", String(limit - usage[field]));

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function validateChatQuestion(req, res, next) {
  const question = req.body?.question;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      message: "Please enter a question.",
    });
  }

  if (question.trim().length > 1000) {
    return res.status(413).json({
      message: "Your question must be 1,000 characters or fewer.",
      maxLength: 1000,
    });
  }

  req.body.question = question.trim();
  return next();
}

module.exports = {
  chatUsageLimiter: createQuotaLimiter(
    "chatRequests",
    CHAT_DAILY_LIMIT,
    "AI chat",
  ),
  uploadUsageLimiter: createQuotaLimiter(
    "uploads",
    UPLOAD_DAILY_LIMIT,
    "AI report upload",
  ),
  validateChatQuestion,
};
