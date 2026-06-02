#!/usr/bin/env node

console.log("=== DIAGNOSTIC TOOL ===\n");

// Check Node version
console.log(`Node version: ${process.version}`);

// Check if .env loads
try {
  require("dotenv").config();
  console.log("✓ .env file loaded");
} catch (e) {
  console.error("✗ Failed to load .env:", e.message);
  process.exit(1);
}

// Check environment variables
console.log("\n--- Environment Variables ---");
console.log(`PORT: ${process.env.PORT}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? "SET" : "NOT SET"}`);
console.log(`BASE_URL: ${process.env.BASE_URL}`);

// Check dependencies
console.log("\n--- Checking Dependencies ---");
const deps = [
  "express",
  "mongoose",
  "cors",
  "dotenv",
  "helmet",
  "multer",
  "qrcode",
  "cloudinary",
  "nodemailer",
  "exceljs",
  "twilio",
];

for (const dep of deps) {
  try {
    require(dep);
    console.log(`✓ ${dep}`);
  } catch (e) {
    console.error(`✗ ${dep} - MISSING`);
  }
}

// Test MongoDB connection
console.log("\n--- Testing MongoDB Connection ---");
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✓ MongoDB connection successful!");
    
    // Test loading model
    try {
      const Visitor = require("./backend/models/Visitor");
      console.log("✓ Visitor model loaded");
    } catch (e) {
      console.error("✗ Failed to load Visitor model:", e.message);
    }
    
    // Test loading app
    try {
      const app = require("./backend/app");
      console.log("✓ Express app loaded");
      
      // Try starting server
      const PORT = process.env.PORT || 3000;
      const server = app.listen(PORT, () => {
        console.log(`✓ Server started on port ${PORT}`);
        console.log("\n=== ALL CHECKS PASSED ===");
        console.log(`Visit: http://localhost:${PORT}`);
        process.exit(0);
      });
      
      server.on("error", (err) => {
        console.error(`✗ Server error: ${err.message}`);
        if (err.code === "EADDRINUSE") {
          console.error(`Port ${PORT} is already in use!`);
          console.error("Run: lsof -ti:3000 | xargs kill -9");
        }
        process.exit(1);
      });
      
    } catch (e) {
      console.error("✗ Failed to load app:", e.message);
      console.error(e.stack);
      process.exit(1);
    }
    
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed!");
    console.error(`Error: ${err.message}`);
    console.error(`Code: ${err.code || "N/A"}`);
    
    console.log("\n--- Troubleshooting Tips ---");
    if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
      console.log("• DNS resolution failed - check your internet connection");
    } else if (err.message.includes("authentication failed")) {
      console.log("• Wrong username or password");
      console.log("• Check credentials in MongoDB Atlas");
    } else if (err.message.includes("timeout")) {
      console.log("• Connection timeout - check Network Access in MongoDB Atlas");
      console.log("• Make sure your IP is whitelisted (or use 0.0.0.0/0)");
    }
    
    process.exit(1);
  });

// Timeout
setTimeout(() => {
  console.error("\n✗ Diagnostic timeout after 15 seconds");
  process.exit(1);
}, 15000);
