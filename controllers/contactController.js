const Message = require('../models/Message');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendLater, templates } = require('../utils/mailer');

// POST /api/contact
const sendMessage = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  await Message.create({ name, email, phone, subject, message });
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    sendLater({ to: process.env.ADMIN_NOTIFY_EMAIL, replyTo: email, ...templates.contactMessage({ name, email, phone, subject, message }) });
  }
  res.status(201).json({ message: 'Message sent. We usually reply within one working day.' });
});

module.exports = { sendMessage };
