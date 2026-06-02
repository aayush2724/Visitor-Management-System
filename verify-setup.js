#!/usr/bin/env node

require("dotenv").config();

// Log to file instead of console
const fs = require("fs");
const log = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync("/tmp/verify.log", `[${timestamp}] ${msg}\n`);
};

log("Starting verification...");

// Check environment variables
log(`PORT: ${process.env.PORT}`);
log(`MONGODB_URI exists: ${!!process.env.MONGODB_URI}`);
log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME}`);

// Try to connect
const mongoose = require("mongoose");

log("Attempting MongoDB connection...");

mongoose
  .connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => {
    log("✓ MongoDB connection SUCCESS!");
    log("Database name: visitor-management");
    
    // Try to load a model
    const Visitor = require("./backend/models/Visitor");
    log("✓ Visitor model loaded successfully");
    
    process.exit(0);
  })
  .catch((err) => {
    log(`✗ MongoDB connection FAILED: ${err.message}`);
    log(`Error code: ${err.code}`);
    process.exit(1);
  });

// Timeout after 15 seconds
setTimeout(() => {
  log("✗ Connection timeout after 15 seconds");
  process.exit(1);
}, 15000);
