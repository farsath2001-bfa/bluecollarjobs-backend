const mongoose = require('mongoose');

// Messages sent from the public Contact page
const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, required: [true, 'Message is required'], maxlength: 2000 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
