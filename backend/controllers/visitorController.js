const Visitor = require("../models/Visitor");
const QRCode = require("qrcode");
const ExcelJS = require("exceljs");
const cloudinary = require("cloudinary").v2;
const { notifyVisitorRegistration } = require("../utils/notificationService");

const dashboardClients = new Set();

const subscribeUpdates = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  dashboardClients.add(res);
  req.on("close", () => dashboardClients.delete(res));
  res.write("data: connected\n\n");
};

const notifyDashboardUpdate = () => {
  dashboardClients.forEach((client) => {
    try { client.write("data: update\n\n"); } catch (e) { dashboardClients.delete(client); }
  });
};

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
    console.error("QR Code generation/upload failed:", err.message);
    return null;
  }
}

const registerVisitor = async (req, res) => {
  try {
    const {
      full_name, contact_number, department_visiting, person_to_visit,
      email, host_email, host_phone, purpose_of_visit, visitor_type,
      expected_duration, nda_signed, notes,
    } = req.body;

    if (!full_name || !contact_number || !department_visiting || !person_to_visit) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    const previousVisits = await Visitor.countDocuments({
      contact_number: contact_number.replace(/[\s\-]/g, ""),
    });
    const isRepeat = previousVisits > 0;

    let photoUrl = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, "visitors/photos", `visitor-${Date.now()}`);
        photoUrl = result.secure_url;
      } catch (err) {
        console.error("Photo upload failed:", err.message);
      }
    }

    const newVisitor = new Visitor({
      full_name, contact_number, department_visiting, person_to_visit,
      email: email || "", host_email: host_email || "", host_phone: host_phone || "",
      purpose_of_visit: purpose_of_visit || "Meeting",
      visitor_type: visitor_type || "Guest",
      expected_duration: expected_duration || "1 Hour",
      nda_signed: nda_signed === "true" || nda_signed === true,
      notes: notes || "",
      photo_path: photoUrl,
      in_time: new Date(),
      is_repeat: isRepeat,
      visit_count: previousVisits + 1,
    });

    await newVisitor.save();
    const visitorId = newVisitor._id.toString();
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    const qrUrl = await generateQRCode(visitorId, baseUrl);
    if (qrUrl) { newVisitor.qr_code_path = qrUrl; await newVisitor.save(); }

    notifyVisitorRegistration(newVisitor, baseUrl).catch((err) =>
      console.error("Notification error:", err.message)
    );

    notifyDashboardUpdate();

    res.json({
      id: visitorId,
      badge_number: newVisitor.badge_number,
      full_name,
      contact_number,
      department_visiting,
      person_to_visit,
      qr_code_path: qrUrl,
      photo_path: photoUrl,
      is_repeat: isRepeat,
      visit_count: previousVisits + 1,
      message: "Visitor registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const checkRepeatVisitor = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json({ is_repeat: false, visit_count: 0 });
    const clean = phone.replace(/[\s\-]/g, "");
    const count = await Visitor.countDocuments({ contact_number: clean });
    const lastVisit = count > 0
      ? await Visitor.findOne({ contact_number: clean }).sort({ in_time: -1 }).lean()
      : null;
    res.json({ is_repeat: count > 0, visit_count: count, last_name: lastVisit?.full_name, last_visit: lastVisit?.in_time });
  } catch (err) {
    res.status(500).json({ error: "Check failed" });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await Visitor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $and: [{ $not: ["$out_time"] }, { $ne: ["$scheduled", true] }] }, 1, 0] } },
          released: { $sum: { $cond: [{ $and: [{ $ne: ["$out_time", null] }, { $eq: ["$security_confirmed", true] }] }, 1, 0] } },
          security_pending: { $sum: { $cond: [{ $and: [{ $ne: ["$out_time", null] }, { $eq: ["$security_confirmed", false] }] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ["$scheduled", true] }, 1, 0] } },
          flagged: { $sum: { $cond: [{ $eq: ["$is_flagged", true] }, 1, 0] } },
        },
      },
    ]);
    const row = stats[0] || {};
    res.json({
      total: row.total || 0, active: row.active || 0, released: row.released || 0,
      scheduled: row.scheduled || 0, security_pending: row.security_pending || 0, flagged: row.flagged || 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

const getAllVisitors = async (req, res) => {
  const { status, search, from, to } = req.query;
  let query = {};

  if (status === "active") { query.out_time = { $exists: false }; query.scheduled = { $ne: true }; }
  else if (status === "released") { query.out_time = { $ne: null }; query.security_confirmed = true; }
  else if (status === "security-pending") { query.out_time = { $ne: null }; query.security_confirmed = false; }
  else if (status === "scheduled") { query.scheduled = true; }
  else if (status === "flagged") { query.is_flagged = true; }

  if (search) {
    const re = { $regex: search, $options: "i" };
    query.$or = [{ full_name: re }, { contact_number: re }, { department_visiting: re }, { person_to_visit: re }, { badge_number: re }];
  }

  if (from || to) {
    query.in_time = {};
    if (from) query.in_time.$gte = new Date(from);
    if (to) query.in_time.$lte = new Date(to);
  }

  try {
    const visitors = await Visitor.find(query).sort({ in_time: -1 }).limit(500).lean();
    res.json(visitors.map((v) => ({ ...v, id: v._id.toString() })));
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
};

const getVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).lean();
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });
    res.json({ ...visitor, id: visitor._id.toString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch visitor" });
  }
};

const exportVisitors = async (req, res) => {
  const token = req.query.token;
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).send("Unauthorized");

  try {
    const { period, from, to } = req.query;
    let query = {};
    if (period === "day") { const d = new Date(); d.setHours(0,0,0,0); query.in_time = { $gte: d }; }
    else if (period === "week") { const d = new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); query.in_time = { $gte: d }; }
    else if (period === "month") { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); query.in_time = { $gte: d }; }
    else if (from || to) { query.in_time = {}; if(from) query.in_time.$gte=new Date(from); if(to) query.in_time.$lte=new Date(to); }

    const visitors = await Visitor.find(query).sort({ in_time: -1 }).lean();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SECURE VMS";
    const ws = workbook.addWorksheet("Visitors", { properties: { tabColor: { argb: "6366F1" } } });

    ws.columns = [
      { header: "Badge No.", key: "badge_number", width: 15 },
      { header: "Full Name", key: "full_name", width: 25 },
      { header: "Contact", key: "contact_number", width: 18 },
      { header: "Email", key: "email", width: 25 },
      { header: "Department", key: "department_visiting", width: 20 },
      { header: "Host", key: "person_to_visit", width: 20 },
      { header: "Purpose", key: "purpose_of_visit", width: 15 },
      { header: "Visitor Type", key: "visitor_type", width: 15 },
      { header: "Expected Duration", key: "expected_duration", width: 18 },
      { header: "Check-in", key: "in_time", width: 22, style: { numFmt: "yyyy-mm-dd hh:mm:ss" } },
      { header: "Check-out", key: "out_time", width: 22, style: { numFmt: "yyyy-mm-dd hh:mm:ss" } },
      { header: "Status", key: "status", width: 15 },
      { header: "Repeat Visitor", key: "is_repeat", width: 15 },
      { header: "Flagged", key: "is_flagged", width: 12 },
      { header: "Photo URL", key: "photo_path", width: 40 },
      { header: "NDA Signed", key: "nda_signed", width: 12 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "6366F1" } };

    visitors.forEach((v) => {
      ws.addRow({
        ...v,
        in_time: v.in_time ? new Date(v.in_time) : null,
        out_time: v.out_time ? new Date(v.out_time) : null,
        status: v.scheduled ? "Scheduled" : v.security_confirmed ? "Completed" : v.out_time ? "Pending Exit" : "Active",
        is_repeat: v.is_repeat ? "Yes" : "No",
        is_flagged: v.is_flagged ? "⚠ Yes" : "No",
        nda_signed: v.nda_signed ? "Yes" : "No",
      });
    });

    const filename = `SECURE_Visitors_${period || "custom"}_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
};

const approveVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!visitor) return res.status(404).send("Visitor not found");
    notifyDashboardUpdate();
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Visitor Approved — SECURE</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body{font-family:Inter,sans-serif;background:#080c14;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .card{background:#0f1420;border:1px solid #1e293b;border-radius:16px;padding:48px 40px;text-align:center;max-width:440px;width:90%;}
    .icon{width:64px;height:64px;background:rgba(16,185,129,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:2rem;}
    h1{color:#10b981;font-size:1.6rem;margin:0 0 8px;}
    p{color:#64748b;margin:0 0 8px;font-size:0.95rem;}
    .name{color:#f1f5f9;font-weight:700;font-size:1.1rem;margin:16px 0;}
    .badge{font-family:monospace;color:#6366f1;font-size:1rem;background:rgba(99,102,241,0.1);padding:6px 14px;border-radius:6px;display:inline-block;margin:8px 0 24px;}
    .btn{display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;cursor:pointer;border:none;font-size:0.95rem;transition:.2s;}
    .btn-release{background:#ef4444;color:white;margin-top:8px;}
    .btn-release:hover{background:#dc2626;}
    .btn-close{background:transparent;color:#64748b;border:1px solid #1e293b;margin-left:8px;}
    .btn-close:hover{background:#1e293b;color:#f1f5f9;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Visitor Approved</h1>
    <p>Entry has been authorized for:</p>
    <div class="name">${visitor.full_name}</div>
    <div class="badge">${visitor.badge_number || "N/A"}</div>
    <p style="color:#64748b;font-size:0.85rem;margin-bottom:24px;">${visitor.department_visiting} → ${visitor.person_to_visit}</p>
    <div>
      <button class="btn btn-release" onclick="releaseVisitor('${visitor._id}')">Release Visitor</button>
      <button class="btn btn-close" onclick="window.close()">Close</button>
    </div>
  </div>
  <script>
    function releaseVisitor(id){
      fetch('${baseUrl}/api/visitors/'+id+'/release',{method:'POST'})
        .then(r=>{if(r.ok){document.querySelector('.icon').textContent='🚪';document.querySelector('h1').textContent='Visitor Released';setTimeout(()=>window.close(),2000);}else alert('Release failed.');})
        .catch(()=>alert('Network error.'));
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).send("Failed to approve visitor");
  }
};

const checkoutVisitor = async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { out_time: new Date() });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) { res.status(500).send("Checkout failed"); }
};

const releaseVisitor = async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { out_time: new Date() });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) { res.status(500).send("Release failed"); }
};

const securityCheckout = async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { security_confirmed: true, security_out_time: new Date() });
    notifyDashboardUpdate();
    res.sendStatus(200);
  } catch (err) { res.status(500).send("Checkout failed"); }
};

const deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });
    notifyDashboardUpdate();
    res.json({ message: "Visitor deleted" });
  } catch (err) { res.status(500).json({ error: "Failed to delete" }); }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: "No IDs provided" });
    await Visitor.deleteMany({ _id: { $in: ids } });
    notifyDashboardUpdate();
    res.json({ message: `${ids.length} records deleted` });
  } catch (err) { res.status(500).json({ error: "Bulk delete failed" }); }
};

const allowEntry = async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, { scheduled: false, in_time: new Date(), approved: true }, { new: true }).lean();
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });
    notifyDashboardUpdate();
    res.json({ ...visitor, id: visitor._id.toString() });
  } catch (err) { res.status(500).json({ error: "Failed to allow entry" }); }
};

const flagVisitor = async (req, res) => {
  try {
    const { reason } = req.body;
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, { is_flagged: true, flag_reason: reason || "Flagged by admin" }, { new: true });
    if (!visitor) return res.status(404).json({ error: "Not found" });
    notifyDashboardUpdate();
    res.json({ message: "Visitor flagged", visitor });
  } catch (err) { res.status(500).json({ error: "Flag failed" }); }
};

const unflagVisitor = async (req, res) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { is_flagged: false, flag_reason: "" });
    notifyDashboardUpdate();
    res.json({ message: "Flag removed" });
  } catch (err) { res.status(500).json({ error: "Unflag failed" }); }
};

const testEmail = async (req, res) => {
  const { sendEmail } = require("../utils/notificationService");
  const info = {
    resend: !!process.env.RESEND_API_KEY,
    gmail: !!process.env.EMAIL_USER,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    hrEmail: process.env.HR_EMAIL || "Not set",
    hrPhone: process.env.HR_PHONE || "Not set",
  };
  try {
    const result = await sendEmail({
      to: process.env.HR_EMAIL || "test@example.com",
      subject: "SECURE VMS — System Test",
      html: `<div style="font-family:Inter,sans-serif;padding:24px;background:#080c14;color:#f1f5f9;border-radius:8px;"><h2 style="color:#6366f1;">✅ System Test OK</h2><pre style="background:#0f1420;padding:16px;border-radius:8px;color:#94a3b8;">${JSON.stringify(info, null, 2)}</pre></div>`,
    });
    res.json({ ok: true, result, config: info });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, config: info });
  }
};

module.exports = {
  subscribeUpdates, notifyDashboardUpdate, registerVisitor, checkRepeatVisitor,
  getStats, getAllVisitors, getVisitor, exportVisitors, approveVisitor,
  checkoutVisitor, releaseVisitor, securityCheckout, deleteVisitor, bulkDelete,
  allowEntry, flagVisitor, unflagVisitor, testEmail,
};
