const Company = require('../models/Company');
const Job = require('../models/Job');
const { asyncHandler, HttpError, escapeRegex } = require('../utils/asyncHandler');

const EDITABLE = ['name', 'description', 'logo', 'website', 'location', 'industry', 'phone', 'email', 'isVerified'];

const pick = (body) =>
  EDITABLE.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: body[f] } : acc), {});

// Open jobs for a company: linked by id, or (for older jobs) by name
const jobMatch = (company) => ({
  ...Job.openFilter(),
  $and: [{ $or: [{ company: company._id }, { companyName: new RegExp(`^${escapeRegex(company.name)}$`, 'i') }] }],
});

// GET /api/companies?search=
const getAllCompanies = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { location: rx }, { industry: rx }];
  }
  const companies = await Company.find(filter).sort({ name: 1 }).lean();

  const counts = await Promise.all(companies.map((c) => Job.countDocuments(jobMatch(c))));
  res.json(companies.map((c, i) => ({ ...c, openJobs: counts[i] })));
});

// GET /api/companies/:id — company plus its open jobs
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).lean();
  if (!company) throw new HttpError(404, 'Company not found');
  const jobs = await Job.find(jobMatch(company)).sort({ createdAt: -1 }).select('-__v');
  res.json({ ...company, openJobs: jobs.length, jobs });
});

// POST /api/companies
const createCompany = asyncHandler(async (req, res) => {
  const company = await Company.create({ ...pick(req.body), createdBy: req.user._id });
  res.status(201).json(company);
});

// PUT /api/companies/:id — renaming also updates jobs that carry the old name
const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw new HttpError(404, 'Company not found');
  const oldName = company.name;

  company.set(pick(req.body));
  await company.save();

  await Job.updateMany(
    { $or: [{ company: company._id }, { companyName: oldName }] },
    { $set: { company: company._id, companyName: company.name, ...(req.body.logo ? { logo: company.logo } : {}) } }
  );
  res.json(company);
});

// DELETE /api/companies/:id — jobs stay, just unlinked
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndDelete(req.params.id);
  if (!company) throw new HttpError(404, 'Company not found');
  await Job.updateMany({ company: company._id }, { $unset: { company: 1 } });
  res.json({ message: 'Company deleted' });
});

module.exports = { getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };
