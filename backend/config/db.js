const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn("⚠  MONGODB_URI not set — running in limited mode (no database).");
    console.warn("   Set MONGODB_URI in Secrets to enable all features.");
    return;
  }

  console.log("Attempting to connect to MongoDB...");
  console.log(
    "Connection string (truncated):",
    mongoUri.substring(0, 50) + "..."
  );

  const mongoOptions = {
    family: 4,
    serverSelectionTimeoutMS: 8000,
  };

  try {
    await mongoose.connect(mongoUri, mongoOptions);
    console.log("✓ Successfully connected to MongoDB!");
  } catch (err) {
    console.error("✗ CRITICAL: MongoDB connection failed!");
    console.error("Error:", err.message);
    console.error("Code:", err.code);

    if (
      err.message.includes("ECONNREFUSED") ||
      err.code === "ECONNREFUSED"
    ) {
      console.error(
        "\n⚠️  Cannot connect to MongoDB. Possible causes:"
      );
      console.error(
        "  1. MongoDB is not running locally"
      );
      console.error("  2. Your IP is not whitelisted in MongoDB Atlas");
      console.error(
        "  3. Incorrect connection string or credentials"
      );
      console.error(
        "  4. Firewall blocking connection"
      );
    }

    if (mongoUri.includes("mongodb+srv")) {
      console.error(
        "\n💡 Tip: Using MongoDB Atlas (mongodb+srv):"
      );
      console.error("  • Verify credentials in .env file");
      console.error(
        "  • Check Network Access in MongoDB Atlas (add your IP)"
      );
      console.error(
        "  • Ensure the database user has correct permissions"
      );
    }

    process.exit(1);
  }
};

module.exports = connectDB;
