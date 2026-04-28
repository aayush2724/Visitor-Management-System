const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  contact_number: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // Accepts 7–15 digits, optional leading +, spaces/dashes stripped
        return /^\+?[0-9]{7,15}$/.test(v.replace(/[\s\-]/g, ""));
      },
      message: (props) =>
        `${props.value} is not a valid phone number! Must be 7–15 digits.`,
    },
  },
  department_visiting: {
    type: String,
    required: true,
  },
  person_to_visit: {
    type: String,
    required: true,
    trim: true,
  },
  purpose_of_visit: {
    type: String,
    default: "General",
  },
  in_time: {
    type: Date,
    default: Date.now,
  },
  out_time: {
    type: Date,
  },
  security_confirmed: {
    type: Boolean,
    default: false,
  },
  security_out_time: {
    type: Date,
  },
  photo_path: {
    type: String,
  },
  email_sent: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  qr_code_path: {
    type: String,
  },
  scheduled: {
    type: Boolean,
    default: false,
  },
  scheduled_date: {
    type: Date,
  },
});

module.exports = mongoose.model("Visitor", visitorSchema);
