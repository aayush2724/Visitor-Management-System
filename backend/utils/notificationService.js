const nodemailer = require("nodemailer");
const twilio = require("twilio");

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("Twilio init failed:", e.message);
  }
}

let resendClient = null;
try {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
} catch (e) {
  console.warn("Resend init failed:", e.message);
}

const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendEmail({ to, subject, html, from }) {
  if (!to) return { skipped: true, reason: "No recipient" };
  const fromAddr = from || process.env.EMAIL_FROM || "SECURE VMS <onboarding@resend.dev>";
  try {
    if (resendClient) {
      const result = await resendClient.emails.send({ from: fromAddr, to, subject, html });
      if (result.error) throw new Error(result.error.message);
      return { success: true, provider: "resend", id: result.data?.id };
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const info = await gmailTransporter.sendMail({ from: fromAddr, to, subject, html });
      return { success: true, provider: "gmail", id: info.messageId };
    } else {
      return { skipped: true, reason: "No email provider configured" };
    }
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { success: false, error: err.message };
  }
}

async function sendSMS(to, body) {
  if (!to) return { skipped: true, reason: "No recipient" };
  if (!twilioClient) return { skipped: true, reason: "Twilio not configured" };
  if (!process.env.TWILIO_PHONE_NUMBER) return { skipped: true, reason: "TWILIO_PHONE_NUMBER not set" };
  try {
    const clean = to.replace(/[\s\-]/g, "");
    const number = clean.startsWith("+") ? clean : `+${clean}`;
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: number,
      body,
    });
    return { success: true, provider: "twilio-sms", sid: msg.sid };
  } catch (err) {
    console.error("SMS send failed:", err.message);
    return { success: false, error: err.message };
  }
}

async function sendWhatsApp(to, body) {
  if (!to) return { skipped: true, reason: "No recipient" };
  if (!twilioClient) return { skipped: true, reason: "Twilio not configured" };
  if (!process.env.TWILIO_WHATSAPP_NUMBER) return { skipped: true, reason: "TWILIO_WHATSAPP_NUMBER not set" };
  try {
    const clean = to.replace(/[\s\-]/g, "");
    const number = clean.startsWith("+") ? clean : `+${clean}`;
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${number}`,
      body,
    });
    return { success: true, provider: "twilio-whatsapp", sid: msg.sid };
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
    return { success: false, error: err.message };
  }
}

function buildVisitorEmailHtml({ visitor, baseUrl, type }) {
  const approvalUrl = `${baseUrl}/api/visitors/${visitor._id}/approve`;
  const badgeUrl = `${baseUrl}/badge.html?id=${visitor._id}`;

  const colors = { bg: "#080c14", card: "#0f1420", accent: "#6366f1", text: "#f1f5f9", muted: "#64748b", green: "#10b981" };

  if (type === "approval") {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:${colors.card};border-radius:12px;border:1px solid #1e293b;overflow:hidden;">
  <div style="background:${colors.accent};padding:24px 32px;">
    <h1 style="margin:0;color:white;font-size:1.4rem;font-weight:700;">🔐 Visitor Approval Required</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:0.9rem;">A new visitor has arrived and needs your approval</p>
  </div>
  <div style="padding:32px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;width:40%;">Visitor Name</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};font-weight:600;">${visitor.full_name}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;">Badge No.</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.accent};font-weight:600;font-family:monospace;">${visitor.badge_number || "N/A"}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;">Contact</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};">${visitor.contact_number}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;">Department</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};">${visitor.department_visiting}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;">Purpose</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};">${visitor.purpose_of_visit}</td></tr>
      <tr><td style="padding:10px 0;color:${colors.muted};font-size:0.85rem;">Visitor Type</td><td style="padding:10px 0;color:${colors.text};">${visitor.visitor_type}</td></tr>
    </table>
    ${visitor.photo_path ? `<div style="margin:20px 0;text-align:center;"><img src="${visitor.photo_path}" style="width:120px;height:120px;border-radius:8px;object-fit:cover;border:2px solid ${colors.accent};" alt="Visitor Photo"></div>` : ""}
    ${visitor.qr_code_path ? `<div style="margin:20px 0;text-align:center;"><img src="${visitor.qr_code_path}" style="width:140px;height:140px;border-radius:8px;border:2px solid #1e293b;" alt="QR Code"></div>` : ""}
    <div style="text-align:center;margin:32px 0 16px;">
      <a href="${approvalUrl}" style="display:inline-block;background:${colors.green};color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;">✓ Approve Visitor</a>
    </div>
    <div style="text-align:center;">
      <a href="${badgeUrl}" style="display:inline-block;background:transparent;color:${colors.accent};padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem;border:1px solid ${colors.accent};">View Digital Badge</a>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
    <p style="margin:0;color:${colors.muted};font-size:0.75rem;">SECURE Visitor Management System • This link expires in 24 hours</p>
  </div>
</div>
</body></html>`;
  }

  if (type === "confirmation") {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:${colors.card};border-radius:12px;border:1px solid #1e293b;overflow:hidden;">
  <div style="background:${colors.green};padding:24px 32px;">
    <h1 style="margin:0;color:white;font-size:1.4rem;font-weight:700;">✅ Visit Confirmed</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:0.9rem;">Your visit has been registered with SECURE VMS</p>
  </div>
  <div style="padding:32px;">
    <p style="color:${colors.text};font-size:1rem;">Hello <strong>${visitor.full_name}</strong>,</p>
    <p style="color:${colors.muted};font-size:0.9rem;line-height:1.6;">Your entry has been recorded. Please keep your badge number handy.</p>
    <div style="background:#080c14;border:1px solid #1e293b;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;color:${colors.muted};font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;">Your Badge Number</p>
      <p style="margin:8px 0 0;color:${colors.accent};font-size:2rem;font-weight:700;font-family:monospace;">${visitor.badge_number || "N/A"}</p>
    </div>
    ${visitor.qr_code_path ? `<div style="text-align:center;"><p style="color:${colors.muted};font-size:0.85rem;">Scan at exit gate</p><img src="${visitor.qr_code_path}" style="width:160px;height:160px;border-radius:8px;" alt="Exit QR Code"></div>` : ""}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
    <p style="margin:0;color:${colors.muted};font-size:0.75rem;">SECURE Visitor Management System</p>
  </div>
</div>
</body></html>`;
  }

  if (type === "scheduled") {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:${colors.card};border-radius:12px;border:1px solid #1e293b;overflow:hidden;">
  <div style="background:#7c3aed;padding:24px 32px;">
    <h1 style="margin:0;color:white;font-size:1.4rem;font-weight:700;">📅 Visit Scheduled</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:${colors.text};">Hello <strong>${visitor.full_name}</strong>,</p>
    <p style="color:${colors.muted};line-height:1.6;">Your visit has been pre-scheduled. Details below:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;width:40%;">Host</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};font-weight:600;">${visitor.person_to_visit}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.muted};font-size:0.85rem;">Department</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:${colors.text};">${visitor.department_visiting}</td></tr>
      <tr><td style="padding:10px 0;color:${colors.muted};font-size:0.85rem;">Scheduled</td><td style="padding:10px 0;color:${colors.text};">${visitor.scheduled_date ? new Date(visitor.scheduled_date).toLocaleString() : "TBD"}</td></tr>
    </table>
    ${visitor.qr_code_path ? `<div style="text-align:center;margin:24px 0;"><p style="color:${colors.muted};font-size:0.85rem;margin-bottom:12px;">Show this QR at the gate</p><img src="${visitor.qr_code_path}" style="width:180px;height:180px;border-radius:8px;border:2px solid #1e293b;" alt="Gate QR Code"></div>` : ""}
  </div>
</div>
</body></html>`;
  }

  return "";
}

async function notifyVisitorRegistration(visitor, baseUrl) {
  const results = {};

  results.hrEmail = await sendEmail({
    to: process.env.HR_EMAIL,
    subject: `[SECURE] Approval Needed: ${visitor.full_name} → ${visitor.person_to_visit}`,
    html: buildVisitorEmailHtml({ visitor, baseUrl, type: "approval" }),
  });

  if (visitor.host_email) {
    results.hostEmail = await sendEmail({
      to: visitor.host_email,
      subject: `[SECURE] ${visitor.full_name} has arrived to visit you`,
      html: buildVisitorEmailHtml({ visitor, baseUrl, type: "approval" }),
    });
  }

  if (visitor.email) {
    results.visitorEmail = await sendEmail({
      to: visitor.email,
      subject: `[SECURE] Your visit has been registered — Badge: ${visitor.badge_number}`,
      html: buildVisitorEmailHtml({ visitor, baseUrl, type: "confirmation" }),
    });
  }

  const smsBody = `SECURE VMS: ${visitor.full_name} (Badge: ${visitor.badge_number}) arrived to visit ${visitor.person_to_visit} in ${visitor.department_visiting}. Time: ${new Date().toLocaleTimeString()}`;
  results.hrSms = await sendSMS(process.env.HR_PHONE, smsBody);

  if (visitor.host_phone) {
    results.hostSms = await sendSMS(visitor.host_phone, `SECURE: ${visitor.full_name} has arrived to visit you. Badge: ${visitor.badge_number}`);
  }

  const waBody = `🔐 *SECURE VMS Alert*\n\n*${visitor.full_name}* has arrived.\n\n📋 *Badge:* ${visitor.badge_number}\n🏢 *Department:* ${visitor.department_visiting}\n👤 *Visiting:* ${visitor.person_to_visit}\n🎯 *Purpose:* ${visitor.purpose_of_visit}\n⏰ *Time:* ${new Date().toLocaleTimeString()}\n\n${visitor.qr_code_path ? `QR: ${visitor.qr_code_path}` : ""}`;
  results.hrWhatsApp = await sendWhatsApp(process.env.HR_PHONE, waBody);

  if (visitor.host_phone) {
    results.hostWhatsApp = await sendWhatsApp(visitor.host_phone, `📋 *SECURE:* ${visitor.full_name} is here to see you.\n🏷️ Badge: ${visitor.badge_number}`);
  }

  const visitorSms = `SECURE VMS: Entry confirmed. Badge: ${visitor.badge_number}. Host: ${visitor.person_to_visit}. Keep this for exit.`;
  results.visitorSms = await sendSMS(visitor.contact_number, visitorSms);

  const visitorWa = `✅ *SECURE VMS - Entry Confirmed*\n\nWelcome, *${visitor.full_name}*!\n\n🏷️ *Badge:* ${visitor.badge_number}\n👤 *Host:* ${visitor.person_to_visit}\n🏢 *Department:* ${visitor.department_visiting}\n⏰ *Check-in:* ${new Date().toLocaleTimeString()}\n\nPlease keep this message for check-out.`;
  results.visitorWhatsApp = await sendWhatsApp(visitor.contact_number, visitorWa);

  return results;
}

async function notifyScheduledVisit(visitor, baseUrl) {
  const results = {};

  if (visitor.email) {
    results.email = await sendEmail({
      to: visitor.email,
      subject: `[SECURE] Visit Scheduled — ${visitor.scheduled_date ? new Date(visitor.scheduled_date).toDateString() : "TBD"}`,
      html: buildVisitorEmailHtml({ visitor, baseUrl, type: "scheduled" }),
    });
  }

  const smsBody = `SECURE VMS: Your visit to ${visitor.department_visiting} is confirmed for ${visitor.scheduled_date ? new Date(visitor.scheduled_date).toLocaleString() : "the scheduled time"}. ${visitor.qr_code_path ? `QR: ${visitor.qr_code_path}` : ""}`;
  results.sms = await sendSMS(visitor.contact_number, smsBody);

  const waBody = `📅 *SECURE VMS — Visit Scheduled*\n\nHello *${visitor.full_name}*,\n\nYour visit is confirmed!\n\n🏢 *To:* ${visitor.department_visiting}\n👤 *Host:* ${visitor.person_to_visit}\n🗓️ *Date:* ${visitor.scheduled_date ? new Date(visitor.scheduled_date).toLocaleString() : "TBD"}\n${visitor.qr_code_path ? `\n📱 *Gate QR:* ${visitor.qr_code_path}` : ""}`;
  results.whatsapp = await sendWhatsApp(visitor.contact_number, waBody);

  return results;
}

module.exports = {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  notifyVisitorRegistration,
  notifyScheduledVisit,
};
