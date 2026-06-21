const express = require('express');
const router = express.Router();
const { getJobs, getJobById, createJob, applyJob, saveJob, deleteJob } = require('../controllers/jobController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/',              getJobs);
router.get('/:id',           getJobById);
router.post('/',             protect, adminOnly, createJob);
router.post('/:id/apply',    protect, applyJob);
router.post('/:id/save',     protect, saveJob);
router.delete('/:id',        protect, adminOnly, deleteJob);

module.exports = router;