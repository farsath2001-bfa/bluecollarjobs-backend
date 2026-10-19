const express = require('express');
const { getAllJobs, getJobMeta, getJobById, getAdminJobs, createJob, updateJob, deleteJob } = require('../controllers/jobController');
const { applyToJob } = require('../controllers/applicationController');
const { saveJob } = require('../controllers/savedJobController');
const { protect, optionalAuth, adminOrEmployer, approvedEmployer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllJobs);                                // GET    /api/jobs
router.get('/meta', getJobMeta);                            // GET    /api/jobs/meta
router.get('/admin/all', protect, adminOrEmployer, getAdminJobs); // GET /api/jobs/admin/all (employer: own jobs)
router.get('/:id', optionalAuth, getJobById);               // GET    /api/jobs/:id
// Admins: any job. Approved employers: their own company's jobs only.
router.post('/', protect, adminOrEmployer, approvedEmployer, createJob);      // POST   /api/jobs
router.put('/:id', protect, adminOrEmployer, approvedEmployer, updateJob);    // PUT    /api/jobs/:id
router.delete('/:id', protect, adminOrEmployer, approvedEmployer, deleteJob); // DELETE /api/jobs/:id

// Short aliases kept for older frontend builds
router.post('/:id/apply', protect, applyToJob);
router.post('/:id/save', protect, saveJob);

module.exports = router;
