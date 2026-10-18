const Application = require('../models/Application');
const Job = require('../models/Job');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const JOB_FIELDS = 'title companyName logo location salary jobType category isActive createdAt';

// POST /api/applications/:jobId  (alias: POST /api/jobs/:jobId/apply)
const applyToJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  if (req.user.role === 'admin') throw new HttpError(400, 'Admin accounts cannot apply for jobs');

  const job = await Job.findById(jobId);
  if (!job || !job.isActive) throw new HttpError(404, 'This job is no longer accepting applications');

  const already = await Application.findOne({ job: job._id, applicant: req.user._id });
  if (already) throw new HttpError(400, 'You have already applied for this job');

  const { coverLetter = '', phone, resume, availableFrom = '', hasUaeVisa = false } = req.body;
  const contactPhone = phone || req.user.phone;
  if (!contactPhone) throw new HttpError(400, 'Add a phone number so the employer can call you');

  const application = await Application.create({
    job: job._id,
    applicant: req.user._id,
    phone: contactPhone,
    coverLetter,
    resume: resume || req.user.resume,
    availableFrom,
    hasUaeVisa: Boolean(hasUaeVisa),
  });

  // Save the phone to the profile for next time
  if (!req.user.phone && phone) {
    req.user.phone = phone;
    await req.user.save();
  }

  await Job.updateOne({ _id: job._id }, { $inc: { applicantsCount: 1 } });
  res.status(201).json({ message: 'Application sent', application });
});

// GET /api/applications/my
const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate('job', JOB_FIELDS)
    .sort({ createdAt: -1 });
  res.json(applications);
});

// DELETE /api/applications/:id — candidate withdraws their own application
const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, applicant: req.user._id });
  if (!application) throw new HttpError(404, 'Application not found');
  await application.deleteOne();
  await Job.updateOne({ _id: application.job, applicantsCount: { $gt: 0 } }, { $inc: { applicantsCount: -1 } });
  res.json({ message: 'Application withdrawn' });
});

// GET /api/applications?status=&job=   (admin)
const getAllApplications = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.job) filter.job = req.query.job;
  const applications = await Application.find(filter)
    .populate('job', JOB_FIELDS)
    .populate('applicant', 'name email phone location nationality skills experienceYears languages resume')
    .sort({ createdAt: -1 });
  res.json(applications);
});

// PUT /api/applications/:id/status   (admin)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (status && !Application.STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');

  const application = await Application.findById(req.params.id);
  if (!application) throw new HttpError(404, 'Application not found');
  if (status) application.status = status;
  if (adminNote !== undefined) application.adminNote = adminNote;
  await application.save();

  await application.populate([
    { path: 'job', select: JOB_FIELDS },
    { path: 'applicant', select: 'name email phone location nationality skills experienceYears languages resume' },
  ]);
  res.json(application);
});

module.exports = { applyToJob, getMyApplications, withdrawApplication, getAllApplications, updateApplicationStatus };
