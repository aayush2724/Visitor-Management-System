const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/visitor-management";
  console.log("Attempting to connect to MongoDB...");

  const mongoOptions = {
    family: 4,
  };

  try {
    await mongoose.connect(mongoUri, mongoOptions);
    console.log(
      "Successfully connected to MongoDB:",
      mongoUri.split("@").pop().split("?")[0]
    );
  } catch (err) {
    console.error("CRITICAL: MongoDB connection failed!");
    console.error("URI:", mongoUri.split("@").pop().split("?")[0]);
    console.error("Error Details:", err.message);
    if (mongoUri.includes("mongodb+srv")) {
      console.warn(
        "TIP: If you get ECONNREFUSED with +srv, try using the standard connection string format or check your local firewall."
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
