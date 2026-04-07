require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  port: process.env.EMAIL_PORT, // 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

console.log("Sending email...");
transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: process.env.HR_EMAIL,
  subject: "Diagnostics Test",
  text: "Did you receive this email?"
}, (err, info) => {
  if (err) {
    console.error("FAILED TO SEND:", err);
  } else {
    console.log("SUCCESS! Info:", info.response);
  }
});
