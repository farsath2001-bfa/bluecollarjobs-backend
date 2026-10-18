const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Slow down password guessing: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Wait a few minutes and try again.' },
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
