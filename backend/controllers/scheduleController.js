const Visitor = require("../models/Visitor");
const { notifyDashboardUpdate } = require("./visitorController");
const twilio = require("twilio");
const QRCode = require("qrcode");
const cloudinary = require("cloudinary").v2;

// --- Helper Functions (copied from server.js logic) ---
// Note: In a larger app, these would be in a separate service/util file.

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
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

async function uploadToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function generateQRCode(visitorId) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const approvalUrl = `${baseUrl}/api/visitors/${visitorId}/approve`;

  try {
    const qrBuffer = await QRCode.toBuffer(approvalUrl, {
      type: "png",
      width: 300,
    });

    const result = await uploadToCloudinary(
      qrBuffer,
      "visitors/qrcodes",
      `qr-${visitorId}`
    );
    return result.secure_url;
  } catch (err) {
    console.error("QR Code generation/upload failed:", err);
    return null;
  }
}

// --- Controller Method ---

const scheduleVisit = async (req, res) => {
  const {
    full_name,
    contact_number,
    department_visiting,
    person_to_visit,
    scheduled_date,
  } = req.body;

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
        `Your visit to ${department_visiting} has been scheduled.\nShow this QR at the gate: ${
          qrUrl || baseUrl
        }`
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
};

module.exports = { scheduleVisit };
