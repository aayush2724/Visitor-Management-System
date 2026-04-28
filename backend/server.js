require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// --- Import Routes ---
const visitorRoutes = require("./routes/visitorRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

// --- Database Connection ---
connectDB();

// --- Middleware ---
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Files ---
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes ---
app.use("/api/visitors", visitorRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/schedule", scheduleRoutes);

// --- Root Route ---
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "index.html"))
);

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  const mongoose = require("mongoose");
  await mongoose.connection.close();
  process.exit(0);
});
