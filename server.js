require("dotenv").config();
const app = require("./backend/app");
const connectDB = require("./backend/config/db");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

// Start HTTP server first so the UI is always reachable, then connect DB
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SECURE VMS running on port ${PORT}`);
  connectDB();
});

const graceful = async () => {
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(0);
};
process.on("SIGTERM", graceful);
process.on("SIGINT",  graceful);
