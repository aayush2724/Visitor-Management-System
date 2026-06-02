require("dotenv").config();
const mongoose = require("mongoose");

console.log("Testing MongoDB connection...");
console.log("Connection string:", process.env.MONGODB_URI?.substring(0, 50) + "...");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/visitor-management", {
    family: 4,
  })
  .then(() => {
    console.log("✓ MongoDB connection successful!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed:");
    console.error(err.message);
    process.exit(1);
  });
