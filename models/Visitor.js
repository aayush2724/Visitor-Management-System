const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  contact_number: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]*$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  department_visiting: {
    type: String,
    required: true,
  },
  person_to_visit: {
    type: String,
    required: true,
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
});

module.exports = mongoose.model("Visitor", visitorSchema);
