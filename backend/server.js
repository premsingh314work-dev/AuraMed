const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
const cors = require("cors");

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
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

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.log(
      "Ensure MongoDB is running locally or specify MONGODB_URI in your .env file.",
    );
  });

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "AI Medical Report Explainer Backend Gateway is running.",
  });
});

// Mount Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));

// Error handling middleware

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

  if (status === 500) {
    console.error("Unhandled server error:", err.message);
  }

  const messages = {
    400: "Invalid request data. Please check your input and try again.",
    413: "Request or uploaded file is too large. Please reduce the size and try again.",
    500: "Something went wrong on our server. Please try again later.",
  };

  return res.status(status).json({
    message: messages[status],
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Express gateway running on port ${PORT}`);
});
