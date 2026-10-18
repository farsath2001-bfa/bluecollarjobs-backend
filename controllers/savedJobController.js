const SavedJob = require('../models/SavedJob');
const Job = require('../models/Job');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

// POST /api/saved/:jobId  (alias: POST /api/jobs/:id/save)
const saveJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, 'Job not found');

  await SavedJob.updateOne({ user: req.user._id, job: job._id }, { $setOnInsert: { user: req.user._id, job: job._id } }, { upsert: true });
  res.status(201).json({ message: 'Job saved', jobId: job._id });
});

// DELETE /api/saved/:jobId
const unsaveJob = asyncHandler(async (req, res) => {
  await SavedJob.deleteOne({ user: req.user._id, job: req.params.jobId });
  res.json({ message: 'Removed from saved jobs', jobId: req.params.jobId });
});

// GET /api/saved — full job details
const getMySavedJobs = asyncHandler(async (req, res) => {
  const saved = await SavedJob.find({ user: req.user._id })
    .populate('job', 'title companyName logo location salary jobType category isActive createdAt')
    .sort({ createdAt: -1 });
  // Drop entries whose job was deleted
  res.json(saved.filter((s) => s.job));
});

// GET /api/saved/ids — just the ids, for heart/bookmark state on cards
const getMySavedIds = asyncHandler(async (req, res) => {
  const saved = await SavedJob.find({ user: req.user._id }).select('job');
  res.json(saved.map((s) => String(s.job)));
});

module.exports = { saveJob, unsaveJob, getMySavedJobs, getMySavedIds };
