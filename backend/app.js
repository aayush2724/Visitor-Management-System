const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler");

// --- Import Routes ---
const visitorRoutes = require("./routes/visitorRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const app = express();

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
// Serving frontend from the root's frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));
// Serving uploads from the root's uploads folder (if any)
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); 

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

module.exports = app;
