require("dotenv").config();
const app = require("./backend/app");
const connectDB = require("./backend/config/db");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

// --- Database Connection ---
connectDB();

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
const graceful = async () => {
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(0);
};
process.on("SIGTERM", graceful);
process.on("SIGINT",  graceful);
