const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Local dev: load backend/.env if it exists.
// On Render there is no .env file, the dashboard Environment Variables are used instead.
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing. Set it in .env (local) or in the Environment Variables (Render).");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Set it in .env (local) or in the Environment Variables (Render).");
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
    app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });