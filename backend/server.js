const path = require("path");
const dotenv = require("dotenv");

// Load .env from this folder, no matter where the command is run from
const envPath = path.resolve(__dirname, ".env");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath }); // sirf local ke liye
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is empty or missing in .env (check spelling and UTF-8 encoding).");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is empty or missing in .env");
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "not connected",
  })
);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hackathons", require("./routes/hackathonRoutes"));
app.use("/api", require("./routes/teamRoutes"));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });