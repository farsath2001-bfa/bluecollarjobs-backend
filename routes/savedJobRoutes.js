const express = require('express');
const { saveJob, unsaveJob, getMySavedJobs, getMySavedIds } = require('../controllers/savedJobController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getMySavedJobs);       // GET    /api/saved
router.get('/ids', protect, getMySavedIds);     // GET    /api/saved/ids
router.post('/:jobId', protect, saveJob);       // POST   /api/saved/:jobId
router.delete('/:jobId', protect, unsaveJob);   // DELETE /api/saved/:jobId

module.exports = router;
