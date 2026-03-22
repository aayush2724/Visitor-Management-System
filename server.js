require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const Visitor = require("./models/Visitor");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const ExcelJS = require("exceljs");
const twilio = require("twilio");
const cloudinary = require("cloudinary").v2;

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dgusezzo2",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Twilio (guarded) ---
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
}

async function sendWhatsApp(to, message) {
  if (!twilioClient) {
    console.warn("WhatsApp skipped: Twilio not configured");
    return;
  }
  if (!process.env.TWILIO_WHATSAPP_NUMBER) {
    console.warn("WhatsApp skipped: TWILIO_WHATSAPP_NUMBER not set");
    return;
  }
  return twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${to}`,
    body: message,
  });
}

// --- SSE for real-time dashboard updates ---
const dashboardClients = new Set();

app.get("/api/visitors/updates", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  dashboardClients.add(res);
  req.on("close", () => dashboardClients.delete(res));
});

function notifyDashboardUpdate() {
  dashboardClients.forEach((client) => client.write("data: update\n\n"));
}

// --- MongoDB ---
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor-management';
console.log('Attempting to connect to MongoDB...');

const mongoOptions = {
  // Try forcing IPv4 to avoid querySrv ECONNREFUSED on some systems
  family: 4,
};

mongoose.connect(mongoUri, mongoOptions)
  .then(() => console.log('Successfully connected to MongoDB:', mongoUri.split('@').pop().split('?')[0]))
  .catch(err => {
    console.error('CRITICAL: MongoDB connection failed!');
    console.error('URI:', mongoUri.split('@').pop().split('?')[0]);
    console.error('Error Details:', err.message);
    if (mongoUri.includes('mongodb+srv')) {
      console.warn('TIP: If you get ECONNREFUSED with +srv, try using the standard connection string format or check your local firewall.');
    }
    process.exit(1);
  });

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
// Keep local /uploads as fallback for dev
app.use("/uploads", express.static("uploads"));

// --- Multer (memory storage — we upload to Cloudinary, not disk) ---
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// --- Upload buffer to Cloudinary ---
async function uploadToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// --- Generate QR code and upload to Cloudinary ---
async function generateQRCode(visitorId) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const approvalUrl = `${baseUrl}/api/visitors/${visitorId}/approve`;

  try {
    // Generate QR as buffer
    const qrBuffer = await QRCode.toBuffer(approvalUrl, {
      type: "png",
      width: 300,
    });

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      qrBuffer,
      "rsb-visitors/qrcodes",
      `qr-${visitorId}`,
    );
    console.log("QR uploaded to Cloudinary:", result.secure_url);
    return result.secure_url; // Return Cloudinary URL
  } catch (err) {
    console.error("QR Code generation/upload failed:", err);
    return null;
  }
}

// --- Email transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((error) => {
  if (error) console.error("Email server connection failed:", error);
  else console.log("Email server is ready to send messages");
});

// --- POST /api/visitors — Register a new visitor ---
app.post("/api/visitors", upload.single("photo"), async (req, res) => {
  try {
    const { full_name, contact_number, department_visiting, person_to_visit } =
      req.body;

    if (
      !full_name ||
      !contact_number ||
      !department_visiting ||
      !person_to_visit
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Upload photo to Cloudinary
    let photoUrl = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "rsb-visitors/photos",
          `visitor-${Date.now()}`,
        );
        photoUrl = result.secure_url;
        console.log("Photo uploaded to Cloudinary:", photoUrl);
      } catch (err) {
        console.error("Photo upload failed:", err);
        // Continue registration even if photo upload fails
      }
    }

    const newVisitor = new Visitor({
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      photo_path: photoUrl, // Now a Cloudinary URL
      in_time: new Date(),
    });

    await newVisitor.save();
    const visitorId = newVisitor._id.toString();

    // Generate QR and upload to Cloudinary
    const qrUrl = await generateQRCode(visitorId);
    if (qrUrl) {
      newVisitor.qr_code_path = qrUrl;
      await newVisitor.save();
    }

    // Send emails in background — don't block response
    sendEmails({
      visitorId,
      full_name,
      person_to_visit,
      department_visiting,
      contact_number,
      photoUrl,
      qrUrl,
    }).catch((err) => console.error("Background email error:", err));

    notifyDashboardUpdate();

    res.json({
      id: visitorId,
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      message: "Visitor registered successfully",
      qr_code_path: qrUrl,
      photo_path: photoUrl,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// --- Email sending ---
async function sendEmails({
  visitorId,
  full_name,
  person_to_visit,
  department_visiting,
  contact_number,
  photoUrl,
  qrUrl,
}) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const approvalUrl = `${baseUrl}/api/visitors/${visitorId}/approve`;

  const mailOptions = {
    from: `"Visitor System" <${process.env.EMAIL_FROM || "visitor-system@example.com"}>`,
    to: process.env.HR_EMAIL,
    subject: `APPROVAL REQUIRED: ${full_name} visiting ${person_to_visit}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Visitor Approval Required</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>Visitor:</strong> ${full_name}</p>
          <p><strong>Contact:</strong> ${contact_number}</p>
          <p><strong>Visiting:</strong> ${department_visiting} — ${person_to_visit}</p>
          ${photoUrl ? `<img src="${photoUrl}" alt="Visitor photo" style="max-width: 200px; margin: 10px 0; border-radius: 8px;">` : ""}
          ${qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="max-width: 150px; margin: 10px 0; display: block;">` : ""}
        </div>
        <div style="margin: 25px 0; text-align: center;">
          <a href="${approvalUrl}"
             style="background-color: #2ecc71; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            APPROVE VISITOR
          </a>
        </div>
        <p style="font-size: 12px; color: #7f8c8d;">This approval link expires in 24 hours.</p>
      </div>
    `,
  };

  try {
    if (process.env.HR_EMAIL) {
      const hrResult = await transporter.sendMail(mailOptions);
      console.log("Email sent to HR:", hrResult.messageId);
    }
    await Visitor.findByIdAndUpdate(visitorId, { email_sent: true });
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

// --- Test email ---
app.get("/test-email", async (req, res) => {
  try {
    const info = await transporter.sendMail({
      from: `"Visitor System Test" <${process.env.EMAIL_FROM || "visitor-system@example.com"}>`,
      to: process.env.HR_EMAIL || "test@example.com",
      subject: "Visitor System Email Test",
      html: "<b>Success!</b> Your email system is working correctly.",
    });
    res.send(
      `<h1>Email Test Successful</h1><p>Message ID: ${info.messageId}</p>`,
    );
  } catch (error) {
    res
      .status(500)
      .send(`<h1>Email Test Failed</h1><pre>${error.message}</pre>`);
  }
});

// --- GET /api/visitors/stats ---
app.get("/api/visitors/stats", async (req, res) => {
  try {
    const stats = await Visitor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                { $eq: [{ $type: "$out_time" }, "missing"] },
                1,
                { $cond: [{ $eq: ["$out_time", null] }, 1, 0] },
              ],
            },
          },
          released: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$out_time", null] },
                    { $eq: ["$security_confirmed", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          security_pending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$out_time", null] },
                    { $eq: ["$security_confirmed", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          scheduled: {
            $sum: { $cond: [{ $eq: ["$scheduled", true] }, 1, 0] },
          },
        },
      },
    ]);

    const row = stats[0] || {};
    res.json({
      total: row.total || 0,
      active: row.active || 0,
      released: row.released || 0,
      scheduled: row.scheduled || 0,
      security_pending: row.security_pending || 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// --- GET /api/visitors ---
app.get("/api/visitors", async (req, res) => {
  const { status } = req.query;
  let query = {};

  if (status === "active") {
    query.out_time = { $exists: false };
    query.scheduled = { $ne: true };
  } else if (status === "released") {
    query.out_time = { $ne: null };
    query.security_confirmed = true;
  } else if (status === "security-pending") {
    query.out_time = { $ne: null };
    query.security_confirmed = false;
  } else if (status === "scheduled") {
    query.scheduled = true;
  }

  try {
    const visitors = await Visitor.find(query).sort({ in_time: -1 }).lean();
    res.json(visitors.map((v) => ({ ...v, id: v._id.toString() })));
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

// --- GET /api/visitors/export ---
app.get("/api/visitors/export", async (req, res) => {
  try {
    const { period } = req.query;
    let query = {};

    if (period === "day") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      query.in_time = { $gte: d };
    } else if (period === "week") {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      query.in_time = { $gte: d };
    } else if (period === "month") {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      query.in_time = { $gte: d };
    }

    const visitors = await Visitor.find(query).sort({ in_time: -1 }).lean();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Visitors");

    worksheet.columns = [
      { header: "ID", key: "_id", width: 25 },
      { header: "Full Name", key: "full_name", width: 25 },
      { header: "Contact", key: "contact_number", width: 15 },
      { header: "Department", key: "department_visiting", width: 20 },
      { header: "Host", key: "person_to_visit", width: 20 },
      {
        header: "Check-in",
        key: "in_time",
        width: 20,
        style: { numFmt: "yyyy-mm-dd hh:mm:ss" },
      },
      {
        header: "Check-out",
        key: "out_time",
        width: 20,
        style: { numFmt: "yyyy-mm-dd hh:mm:ss" },
      },
      { header: "Photo", key: "photo_path", width: 40 },
      { header: "Status", key: "status", width: 15 },
    ];

    visitors.forEach((visitor) => {
      worksheet.addRow({
        ...visitor,
        status: visitor.scheduled
          ? "Scheduled"
          : visitor.security_confirmed
            ? "Completed"
            : visitor.out_time
              ? "Pending Checkout"
              : "Active",
      });
    });

    const filename = `visitors_${period || "all"}_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res
      .status(500)
      .json({ error: "Failed to export data", details: error.message });
  }
});

// --- GET /api/visitors/:id/approve ---
app.get("/api/visitors/:id/approve", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true },
    );
    if (!visitor) return res.status(404).send("Visitor not found");

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Visitor Approved — RSB</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0fdf4; }
    h1 { color: #16a34a; }
    .btn { padding: 12px 24px; margin: 10px; border: none; color: white; cursor: pointer; border-radius: 6px; font-size: 1rem; }
    .release-btn { background: #dc2626; }
  </style>
</head>
<body>
  <h1>✓ Visitor Approved</h1>
  <p><strong>${visitor.full_name}</strong> is now checked in.</p>
  <button class="btn release-btn" onclick="releaseVisitor('${visitor._id}')">Release Visitor</button>
  <script>
    function releaseVisitor(id) {
      fetch('${baseUrl}/api/visitors/' + id + '/release', { method: 'POST' })
        .then(r => { alert(r.ok ? 'Visitor released.' : 'Release failed.'); if (r.ok) window.close(); });
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).send("Failed to approve visitor");
  }
});

// --- POST /api/visitors/:id/checkout ---
app.post("/api/visitors/:id/checkout", async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { out_time: new Date() });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).send("Checkout failed");
  }
});

// --- POST /api/visitors/:id/release ---
app.post("/api/visitors/:id/release", async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { out_time: new Date() });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error("Release error:", err);
    res.status(500).send("Release failed");
  }
});

// --- POST /api/visitors/:id/security-checkout ---
app.post("/api/visitors/:id/security-checkout", async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, {
      security_confirmed: true,
      security_out_time: new Date(),
    });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.error("Security checkout error:", err);
    res.status(500).send("Checkout failed");
  }
});

// --- POST /api/schedule ---
app.post("/api/schedule", async (req, res) => {
  const { full_name, contact_number, department_visiting, person_to_visit, scheduled_date } =
    req.body;

  if (
    !full_name ||
    !contact_number ||
    !department_visiting ||
    !person_to_visit
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const newVisitor = new Visitor({
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      in_time: new Date(),
      scheduled: true,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
    });
    await newVisitor.save();

    const visitorId = newVisitor._id.toString();
    const qrUrl = await generateQRCode(visitorId);
    if (qrUrl) {
      newVisitor.qr_code_path = qrUrl;
      await newVisitor.save();
    }

    try {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      await sendWhatsApp(
        contact_number,
        `Your visit to ${department_visiting} has been scheduled.\nShow this QR at the gate: ${qrUrl || baseUrl}`,
      );
    } catch (err) {
      console.error("WhatsApp failed:", err.message);
    }

    notifyDashboardUpdate();
    res.json({
      message: "Visit scheduled successfully. QR will be sent via WhatsApp.",
      visitorId,
    });
  } catch (error) {
    console.error("Schedule error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to schedule visit" });
  }
});

// --- DELETE /api/visitors/:id ---
app.delete("/api/visitors/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });
    notifyDashboardUpdate();
    res.json({ message: "Visitor deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete visitor" });
  }
});

// --- POST /api/visitors/:id/allow-entry ---
app.post("/api/visitors/:id/allow-entry", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { scheduled: false, in_time: new Date(), approved: true },
      { new: true },
    ).lean();

    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    notifyDashboardUpdate();
    res.json({ ...visitor, id: visitor._id.toString() });
  } catch (err) {
    console.error("Allow entry error:", err);
    res.status(500).json({ error: "Failed to allow entry" });
  }
});

// --- Static files ---
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html")),
);

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong!", message: err.message });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
