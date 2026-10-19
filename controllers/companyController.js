const Company = require('../models/Company');
const Job = require('../models/Job');
const { asyncHandler, HttpError, escapeRegex } = require('../utils/asyncHandler');
const { sendLater, templates } = require('../utils/mailer');

// Employer companies waiting for approval or suspended are hidden from the public site
const PUBLIC = { status: { $nin: ['pending', 'suspended'] } };

const EDITABLE = ['name', 'description', 'logo', 'website', 'location', 'industry', 'phone', 'email', 'isVerified'];

const pick = (body) =>
  EDITABLE.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: body[f] } : acc), {});

// Open jobs for a company: linked by id, or (for older jobs) by name
const jobMatch = (company) => ({
  ...Job.openFilter(),
  $and: [{ $or: [{ company: company._id }, { companyName: new RegExp(`^${escapeRegex(company.name)}$`, 'i') }] }],
});

// GET /api/companies?search=   (admins also see pending/suspended employers, with the owner's contact)
const getAllCompanies = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const filter = isAdmin ? {} : { ...PUBLIC };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { location: rx }, { industry: rx }];
  }
  let query = Company.find(filter).sort({ name: 1 });
  if (isAdmin) query = query.populate('owner', 'name email phone createdAt');
  else query = query.select('-owner -statusNote -createdBy');
  const companies = await query.lean();

  const counts = await Promise.all(companies.map((c) => Job.countDocuments(jobMatch(c))));
  res.json(companies.map((c, i) => ({ ...c, openJobs: counts[i] })));
});

// GET /api/companies/:id — company plus its open jobs
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).select('-statusNote -createdBy').lean();
  const canSeeHidden = req.user?.role === 'admin' || String(req.user?.company || '') === String(company?._id);
  if (!company || (['pending', 'suspended'].includes(company.status) && !canSeeHidden)) throw new HttpError(404, 'Company not found');
  delete company.owner;
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

// PUT /api/companies/:id/status  { status: approved|suspended|pending, note }   (admin)
// Suspending closes the company's jobs; approving lets the employer post (they reopen jobs themselves).
const setCompanyStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) throw new HttpError(400, 'Unknown status');
  const company = await Company.findById(req.params.id).populate('owner', 'name email phone createdAt');
  if (!company) throw new HttpError(404, 'Company not found');
  const changed = company.status !== status;
  company.status = status;
  company.statusNote = status === 'suspended' ? String(note).trim() : '';
  await company.save();

  if (status === 'suspended') await Job.updateMany({ company: company._id }, { $set: { isActive: false } });
  if (changed && company.owner?.email && status !== 'pending') {
    sendLater({
      to: company.owner.email,
      ...(status === 'approved'
        ? templates.employerApproved({ name: company.owner.name, company })
        : templates.employerSuspended({ name: company.owner.name, company, note: company.statusNote })),
    });
  }
  res.json(company);
});

// DELETE /api/companies/:id — jobs stay, just unlinked
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndDelete(req.params.id);
  if (!company) throw new HttpError(404, 'Company not found');
  await Job.updateMany({ company: company._id }, { $unset: { company: 1 } });
  res.json({ message: 'Company deleted' });
});

module.exports = { getAllCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, setCompanyStatus };
