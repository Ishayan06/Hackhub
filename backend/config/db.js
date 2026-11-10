const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose.connection.on("disconnected", () => console.log("⚠️  MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));
  mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));

  console.log("⏳ Connecting to MongoDB...");
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`✅ MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);
};

module.exports = connectDB;