const Visitor = require("../models/Visitor");
const { notifyDashboardUpdate } = require("./visitorController");
const { notifyScheduledVisit } = require("../utils/notificationService");
const QRCode = require("qrcode");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dgusezzo2",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image" },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(buffer);
  });
}

async function generateQRCode(visitorId, baseUrl) {
  const approvalUrl = `${baseUrl}/api/visitors/${visitorId}/approve`;
  try {
    const qrBuffer = await QRCode.toBuffer(approvalUrl, { type: "png", width: 300, margin: 2 });
    const result = await uploadToCloudinary(qrBuffer, "visitors/qrcodes", `qr-${visitorId}`);
    return result.secure_url;
  } catch (err) {
    console.error("QR Code generation failed:", err.message);
    return null;
  }
}

const scheduleVisit = async (req, res) => {
  const {
    full_name, contact_number, department_visiting, person_to_visit,
    scheduled_date, email, host_email, host_phone, purpose_of_visit,
    visitor_type, expected_duration, notes,
  } = req.body;

  if (!full_name || !contact_number || !department_visiting || !person_to_visit) {
    return res.status(400).json({ error: "All required fields must be filled" });
  }

  try {
    const newVisitor = new Visitor({
      full_name, contact_number, department_visiting, person_to_visit,
      email: email || "", host_email: host_email || "", host_phone: host_phone || "",
      purpose_of_visit: purpose_of_visit || "Meeting",
      visitor_type: visitor_type || "Guest",
      expected_duration: expected_duration || "1 Hour",
      notes: notes || "",
      in_time: new Date(),
      scheduled: true,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
    });

    await newVisitor.save();

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const visitorId = newVisitor._id.toString();
    const qrUrl = await generateQRCode(visitorId, baseUrl);
    if (qrUrl) { newVisitor.qr_code_path = qrUrl; await newVisitor.save(); }

    notifyScheduledVisit(newVisitor, baseUrl).catch((err) =>
      console.error("Schedule notification error:", err.message)
    );

    notifyDashboardUpdate();

    res.json({
      message: "Visit scheduled successfully",
      visitorId,
      badge_number: newVisitor.badge_number,
      qr_code_path: qrUrl,
    });
  } catch (error) {
    console.error("Schedule error:", error);
    res.status(500).json({ error: error.message || "Failed to schedule visit" });
  }
};

module.exports = { scheduleVisit };
