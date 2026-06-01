const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    badge_number: { type: String, unique: true, sparse: true },
    full_name: { type: String, required: true, trim: true },
    contact_number: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\+?[0-9]{7,15}$/.test(v.replace(/[\s\-]/g, "")),
        message: (p) => `${p.value} is not a valid phone number!`,
      },
    },
    email: { type: String, trim: true, default: "" },
    department_visiting: { type: String, required: true },
    person_to_visit: { type: String, required: true, trim: true },
    host_email: { type: String, trim: true, default: "" },
    host_phone: { type: String, trim: true, default: "" },
    purpose_of_visit: {
      type: String,
      enum: ["Meeting", "Interview", "Delivery", "Maintenance", "Inspection", "Training", "General", "Other"],
      default: "Meeting",
    },
    visitor_type: {
      type: String,
      enum: ["Guest", "Client", "Vendor", "Contractor", "Interviewee", "Government", "Other"],
      default: "Guest",
    },
    expected_duration: { type: String, default: "1 Hour" },
    in_time: { type: Date, default: Date.now },
    out_time: { type: Date },
    security_confirmed: { type: Boolean, default: false },
    security_out_time: { type: Date },
    photo_path: { type: String },
    email_sent: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    qr_code_path: { type: String },
    scheduled: { type: Boolean, default: false },
    scheduled_date: { type: Date },
    is_flagged: { type: Boolean, default: false },
    flag_reason: { type: String, default: "" },
    is_repeat: { type: Boolean, default: false },
    visit_count: { type: Number, default: 1 },
    nda_signed: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    notifications_sent: {
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

visitorSchema.pre("save", async function (next) {
  if (!this.badge_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      badge_number: { $regex: `^VIS-${year}-` },
    });
    this.badge_number = `VIS-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Visitor", visitorSchema);
