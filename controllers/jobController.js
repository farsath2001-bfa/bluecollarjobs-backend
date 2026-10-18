const Job = require('../models/Job');
const Company = require('../models/Company');
const { asyncHandler, HttpError, escapeRegex } = require('../utils/asyncHandler');

const EDITABLE = [
  'title', 'description', 'category', 'location', 'company', 'companyName', 'logo', 'salary',
  'jobType', 'requirements', 'benefits', 'vacancies', 'contactPhone', 'isActive',
];

const toList = (v) =>
  Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : String(v || '').split(/\n|,/).map((s) => s.trim()).filter(Boolean);

// Copy allowed fields from the request onto a job document
const applyBody = async (job, body) => {
  EDITABLE.forEach((f) => {
    if (body[f] === undefined) return;
    job[f] = ['requirements', 'benefits'].includes(f) ? toList(body[f]) : body[f];
  });
  if (body.company === '') job.company = undefined;

  // If a company record is linked, keep the denormalised name/logo in sync
  if (job.company) {
    const company = await Company.findById(job.company);
    if (!company) throw new HttpError(400, 'Selected company does not exist');
    job.companyName = company.name;
    if (!body.logo) job.logo = company.logo;
  }
};

const buildFilter = (q, { includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const keyword = q.keyword || q.search || q.q;
  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ title: rx }, { category: rx }, { companyName: rx }, { description: rx }];
  }
  if (q.location) filter.location = new RegExp(escapeRegex(q.location), 'i');
  if (q.category) filter.category = new RegExp(`^${escapeRegex(q.category)}$`, 'i');
  if (q.jobType) filter.jobType = q.jobType;
  if (q.company) filter.company = q.company;
  if (q.minSalary) filter.salaryMin = { $gte: Number(q.minSalary) || 0 };
  if (q.status === 'active') filter.isActive = true;
  if (q.status === 'closed') filter.isActive = false;
  return filter;
};

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  salary: { salaryMin: -1, createdAt: -1 },
};

// GET /api/jobs?keyword=&location=&category=&jobType=&minSalary=&sort=&page=&limit=
const getAllJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const filter = buildFilter(req.query);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v'),
    Job.countDocuments(filter),
  ]);

  res.json({ jobs, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/jobs/meta — counts used for category tiles & filter dropdowns
const getJobMeta = asyncHandler(async (req, res) => {
  const [categories, locations, total, companies] = await Promise.all([
    Job.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Job.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Job.countDocuments({ isActive: true }),
    Company.countDocuments(),
  ]);
  res.json({
    total,
    companies,
    categories: categories.map((c) => ({ name: c._id, count: c.count })),
    locations: locations.map((l) => ({ name: l._id, count: l.count })),
    jobTypes: Job.JOB_TYPES,
  });
});

// GET /api/jobs/:id
const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('company');
  if (!job || (!job.isActive && req.user?.role !== 'admin')) throw new HttpError(404, 'This job is no longer available');

  // A few similar openings for the details page
  const similar = await Job.find({ _id: { $ne: job._id }, isActive: true, category: job.category })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title companyName logo location salary jobType createdAt');

  res.json({ ...job.toObject(), similar });
});

// GET /api/jobs/admin/all — admin list including closed jobs
const getAdminJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find(buildFilter(req.query, { includeInactive: true })).sort({ createdAt: -1 }).select('-__v');
  res.json(jobs);
});

// POST /api/jobs
const createJob = asyncHandler(async (req, res) => {
  const job = new Job({ postedBy: req.user._id });
  await applyBody(job, req.body);
  await job.save();
  res.status(201).json(job);
});

// PUT /api/jobs/:id
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  await applyBody(job, req.body);
  await job.save();
  res.json(job);
});

// DELETE /api/jobs/:id — also removes its applications and saves
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  await Promise.all([
    require('../models/Application').deleteMany({ job: job._id }),
    require('../models/SavedJob').deleteMany({ job: job._id }),
  ]);
  res.json({ message: 'Job deleted' });
});

module.exports = { getAllJobs, getJobMeta, getJobById, getAdminJobs, createJob, updateJob, deleteJob };
