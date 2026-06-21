const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer setup for company logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/',    async (req, res) => {
  const companies = await Company.find();
  res.json(companies);
});

router.get('/:id', async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Company not found' });
  res.json(company);
});

router.post('/', protect, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    const company = await Company.create({
      ...req.body,
      logo: req.file ? req.file.filename : ''
    });
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;