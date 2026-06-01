const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler");

const visitorRoutes = require("./routes/visitorRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/visitors", visitorRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "index.html"))
);

app.use(errorHandler);

module.exports = app;
