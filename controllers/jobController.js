const Job = require('../models/job');

// GET /api/jobs
const getJobs = async (req, res) => {
  try {
    const { category, location, search } = req.query;
    let filter = { isActive: true };

    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, 'i');
    if (search)   filter.title    = new RegExp(search, 'i');

    const jobs = await Job.find(filter).populate('company', 'name logo location');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('company');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jobs  (admin only)
const createJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jobs/:id/apply  (protected)
const applyJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.applicants.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already applied' });
    }
    job.applicants.push(req.user._id);
    await job.save();
    res.json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jobs/:id/save  (protected)
const saveJob = async (req, res) => {
  try {
    const user = req.user;
    const jobId = req.params.id;

    if (user.savedJobs.includes(jobId)) {
      return res.status(400).json({ message: 'Job already saved' });
    }
    user.savedJobs.push(jobId);
    await user.save();
    res.json({ message: 'Job saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/jobs/:id  (admin only)
const deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getJobs, getJobById, createJob, applyJob, saveJob, deleteJob };