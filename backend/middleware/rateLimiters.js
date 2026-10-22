const { rateLimit } = require("express-rate-limit");

const createLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

// Login: maximum 5 attempts per 15 minutes per IP.
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

// Registration: maximum 5 attempts per hour per IP.
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Please try again later.",
});

// Report uploads: maximum 10 uploads per hour per IP.
const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Upload limit reached. Please try again later.",
});

// AI chat: maximum 10 questions per minute per IP.
const chatLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: "You're sending messages too quickly. Please wait a minute.",
});

module.exports = {
  loginLimiter,
  registerLimiter,
  uploadLimiter,
  chatLimiter,
};
