const express = require('express');
const {
  applyToJob, getMyApplications, withdrawApplication, getAllApplications, updateApplicationStatus,
} = require('../controllers/applicationController');
const { protect, adminOrEmployer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my', protect, getMyApplications);                         // GET    /api/applications/my
router.get('/', protect, adminOrEmployer, getAllApplications);         // GET    /api/applications (employer: own jobs)
router.put('/:id/status', protect, adminOrEmployer, updateApplicationStatus); // PUT /api/applications/:id/status
router.post('/:jobId', protect, applyToJob);                           // POST   /api/applications/:jobId
router.delete('/:id', protect, withdrawApplication);                   // DELETE /api/applications/:id

module.exports = router;
