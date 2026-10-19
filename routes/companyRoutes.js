const express = require('express');
const { getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, setCompanyStatus } = require('../controllers/companyController');
const { protect, optionalAuth, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getAllCompanies);           // GET    /api/companies
router.get('/:id', optionalAuth, getCompanyById);         // GET    /api/companies/:id
router.post('/', protect, adminOnly, createCompany);      // POST   /api/companies
router.put('/:id', protect, adminOnly, updateCompany);    // PUT    /api/companies/:id
router.delete('/:id', protect, adminOnly, deleteCompany); // DELETE /api/companies/:id
router.put('/:id/status', protect, adminOnly, setCompanyStatus); // PUT /api/companies/:id/status

module.exports = router;
