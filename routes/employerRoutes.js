const express = require('express');
const { getMyCompany, updateMyCompany } = require('../controllers/employerController');
const { protect, adminOrEmployer } = require('../middleware/authMiddleware');

const router = express.Router();

// Employer accounts only (admins manage companies from the admin panel)
const employerOnly = (req, res, next) =>
  req.user.role === 'employer' ? next() : res.status(403).json({ message: 'Employers only' });

router.use(protect, employerOnly, adminOrEmployer);
router.get('/company', getMyCompany);    // GET /api/employer/company
router.put('/company', updateMyCompany); // PUT /api/employer/company

module.exports = router;
