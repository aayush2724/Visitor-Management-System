const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn("⚠  MONGODB_URI not set — running in limited mode (no database).");
    console.warn("   Set MONGODB_URI in Secrets to enable all features.");
    return;
  }

  console.log("Attempting to connect to MongoDB...");

  try {
    await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 8000 });
    const safeUri = mongoUri.split("@").pop().split("?")[0];
    console.log("✓ MongoDB connected:", safeUri);
  } catch (err) {
    console.error("✗ MongoDB connection failed:", err.message);
    console.warn("  App will continue without database — API calls will fail until DB is available.");
  }
};

module.exports = connectDB;
