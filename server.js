require("dotenv").config();
const app = require("./backend/app");
const connectDB = require("./backend/config/db");
const mongoose = require("mongoose");

// --- Database Connection ---
connectDB();

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing database connection...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Closing database connection...");
  await mongoose.connection.close();
  process.exit(0);
});
