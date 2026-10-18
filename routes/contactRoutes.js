const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendMessage } = require('../controllers/contactController');

const router = express.Router();
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: { message: 'Too many messages. Try again later.' },
});

router.post('/', contactLimiter, sendMessage); // POST /api/contact

module.exports = router;
