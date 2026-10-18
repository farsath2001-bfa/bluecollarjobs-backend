const express = require('express');
const { getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } = require('../controllers/companyController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllCompanies);                         // GET    /api/companies
router.get('/:id', getCompanyById);                       // GET    /api/companies/:id
router.post('/', protect, adminOnly, createCompany);      // POST   /api/companies
router.put('/:id', protect, adminOnly, updateCompany);    // PUT    /api/companies/:id
router.delete('/:id', protect, adminOnly, deleteCompany); // DELETE /api/companies/:id

module.exports = router;
