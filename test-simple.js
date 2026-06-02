const dns = require("dns").promises;

async function test() {
  console.log("Step 1: Testing DNS resolution...");
  try {
    const ip = await dns.resolve4("cluster0.rzjeqfr.mongodb.net");
    console.log("✓ DNS resolved:", ip[0]);
  } catch (e) {
    console.error("✗ DNS failed:", e.message);
    process.exit(1);
  }

  console.log("\nStep 2: Check credentials in .env...");
  require("dotenv").config();
  console.log("MONGODB_URI:", process.env.MONGODB_URI?.substring(0, 70) + "...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "***" : "NOT SET");

  console.log("\nStep 3: Testing MongoDB connection (with 10sec timeout)...");
  const mongoose = require("mongoose");
  
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Connection timeout")), 10000)
  );

  try {
    const connectionPromise = mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/visitor-management",
      { family: 4, serverSelectionTimeoutMS: 10000 }
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log("✓ MongoDB connected successfully!");
    process.exit(0);
  } catch (err) {
    console.error("✗ Connection failed:", err.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check MongoDB Atlas Network Access - add your IP");
    console.error("2. Verify credentials in .env file");
    console.error("3. Check if password contains special characters");
    process.exit(1);
  }
}

test();
