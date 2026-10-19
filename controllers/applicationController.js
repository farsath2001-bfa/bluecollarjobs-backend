const Application = require('../models/Application');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { sendLater, templates } = require('../utils/mailer');

const JOB_FIELDS = 'title companyName logo location salary jobType category isActive createdAt';

// POST /api/applications/:jobId  (alias: POST /api/jobs/:jobId/apply)
const applyToJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId || req.params.id;
  if (req.user.role !== 'candidate') throw new HttpError(400, 'Only job seeker accounts can apply for jobs');

  const job = await Job.findById(jobId);
  if (!job || !job.isOpen) throw new HttpError(404, 'This job is no longer accepting applications');

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

  // Confirmation to the candidate + alert to the admin (never blocks the response)
  sendLater({ to: req.user.email, ...templates.applicationReceivedCandidate({ name: req.user.name, job }) });
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    sendLater({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      replyTo: req.user.email,
      ...templates.applicationReceivedAdmin({ applicant: req.user, job, application }),
    });
  }
  // The employer who posted the job (employer accounts only)
  if (job.company) {
    const company = await Company.findById(job.company).select('owner');
    const owner = company?.owner && (await User.findById(company.owner).select('email name'));
    if (owner?.email) {
      sendLater({ to: owner.email, replyTo: req.user.email, ...templates.applicationReceivedEmployer({ applicant: req.user, job, application }) });
    }
  }

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

// Job ids an employer may see applications for
const employerJobIds = (req) => Job.find({ company: req.company._id }).distinct('_id');

// GET /api/applications?status=&job=   (admin: all; employer: applications to their jobs)
const getAllApplications = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'employer') {
    const ids = (await employerJobIds(req)).map(String);
    filter.job = req.query.job ? (ids.includes(String(req.query.job)) ? req.query.job : null) : { $in: ids };
  } else if (req.query.job) filter.job = req.query.job;
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
  if (req.user.role === 'employer') {
    const ids = (await employerJobIds(req)).map(String);
    if (!ids.includes(String(application.job))) throw new HttpError(404, 'Application not found');
  }
  const statusChanged = status && status !== application.status;
  if (status) application.status = status;
  if (adminNote !== undefined) application.adminNote = adminNote;
  await application.save();

  await application.populate([
    { path: 'job', select: JOB_FIELDS },
    { path: 'applicant', select: 'name email phone location nationality skills experienceYears languages resume' },
  ]);

  // Tell the candidate when their status changes (not for "pending")
  if (statusChanged && status !== 'pending' && application.applicant?.email && application.job) {
    sendLater({
      to: application.applicant.email,
      ...templates.statusChanged({ name: application.applicant.name, job: application.job, status }),
    });
  }

  res.json(application);
});

module.exports = { applyToJob, getMyApplications, withdrawApplication, getAllApplications, updateApplicationStatus };
