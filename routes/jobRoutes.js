const express = require('express');
const { getAllJobs, getJobMeta, getJobById, getAdminJobs, createJob, updateJob, deleteJob } = require('../controllers/jobController');
const { applyToJob } = require('../controllers/applicationController');
const { saveJob } = require('../controllers/savedJobController');
const { protect, optionalAuth, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllJobs);                                // GET    /api/jobs
router.get('/meta', getJobMeta);                            // GET    /api/jobs/meta
router.get('/admin/all', protect, adminOnly, getAdminJobs); // GET    /api/jobs/admin/all
router.get('/:id', optionalAuth, getJobById);               // GET    /api/jobs/:id
router.post('/', protect, adminOnly, createJob);            // POST   /api/jobs
router.put('/:id', protect, adminOnly, updateJob);          // PUT    /api/jobs/:id
router.delete('/:id', protect, adminOnly, deleteJob);       // DELETE /api/jobs/:id

// Short aliases kept for older frontend builds
router.post('/:id/apply', protect, applyToJob);
router.post('/:id/save', protect, saveJob);

module.exports = router;
