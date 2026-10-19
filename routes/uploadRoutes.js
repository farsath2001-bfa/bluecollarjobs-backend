const express = require('express');
const rateLimit = require('express-rate-limit');
const { uploadCv, uploadLogo, uploadStatus, getFileLink } = require('../controllers/uploadController');
const { protect, adminOrEmployer } = require('../middleware/authMiddleware');

const router = express.Router();

// 30 uploads per hour per IP is plenty for real use and stops abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { message: 'Too many uploads. Try again later.' },
});

router.get('/status', uploadStatus);                                     // GET  /api/uploads/status
router.get('/link', protect, getFileLink);                               // GET  /api/uploads/link?url=
router.post('/cv', protect, uploadLimiter, uploadCv);                    // POST /api/uploads/cv
router.post('/logo', protect, adminOrEmployer, uploadLimiter, uploadLogo); // POST /api/uploads/logo (admin or employer)

module.exports = router;
