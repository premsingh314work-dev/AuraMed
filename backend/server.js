const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.set("trust proxy", 1);
// Trust proxy only when your deployment architecture requires it.
// Configure this correctly for your hosting provider before enabling it.
const PORT = Number(process.env.PORT) || 5000;

// Configure FRONTEND_URL as a comma-separated list of trusted origins.
// Example: http://localhost:5173,https://your-frontend.example.com
const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header include many server-to-server
      // clients. CORS is a browser policy, not server authentication.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Do not grant cross-origin browser access to untrusted origins.
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "32kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "32kb",
    parameterLimit: 100,
  }),
);

// Health check: confirms the process is running.
app.get("/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "AuraMed backend is running.",
  });
});

// Mount routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));

// Centralized error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status =
    err.status === 413 ||
    err.statusCode === 413 ||
    err.type === "entity.too.large" ||
    err.code === "LIMIT_FILE_SIZE"
      ? 413
      : err.status === 400 || err.statusCode === 400
        ? 400
        : 500;

  // Log unexpected errors, but never return internal details to clients.
  if (status === 500) {
    console.error("Unhandled server error:", err.message);
  }

  const messages = {
    400: "Invalid request data. Please check your input and try again.",
    413: "Request or uploaded file is too large.",
    500: "Something went wrong on our server. Please try again later.",
  };

  res.status(status).json({
    message: messages[status],
  });
});

let server;

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  // Connect to MongoDB before accepting requests.
  await mongoose.connect(mongoUri);

  console.log("MongoDB connected successfully.");

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`AuraMed Express backend listening on port ${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err.message);
    process.exitCode = 1;
  }

  process.exit();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch((err) => {
  console.error("Failed to start AuraMed backend:", err.message);
  process.exit(1);
});
