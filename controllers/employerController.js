const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { asyncHandler, HttpError, escapeRegex } = require('../utils/asyncHandler');
const { sendLater, templates } = require('../utils/mailer');
const { authPayload } = require('./authController');

// What an employer may change on their own company (not status, verification or owner)
const COMPANY_FIELDS = ['name', 'description', 'logo', 'website', 'location', 'industry', 'phone', 'email'];
const pickCompany = (body) =>
  COMPANY_FIELDS.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: String(body[f]).trim() } : acc), {});

// POST /api/auth/register-employer
// { name, email, password, phone, companyName, industry, location, website, description }
const registerEmployer = asyncHandler(async (req, res) => {
  const { name, email, password, phone, companyName } = req.body;
  if (!name || !email || !password || !companyName) {
    throw new HttpError(400, 'Your name, email, password and company name are required');
  }
  if (!phone) throw new HttpError(400, 'Add a phone number so we can confirm your company');
  if (String(password).length < 6) throw new HttpError(400, 'Use a password with at least 6 characters');

  const cleanEmail = String(email).toLowerCase().trim();
  if (await User.exists({ email: cleanEmail })) throw new HttpError(400, 'That email is already registered');

  const cleanName = String(companyName).trim();
  if (await Company.exists({ name: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') })) {
    throw new HttpError(400, 'A company with this name is already listed. Contact us if it is yours and we will link it to your account.');
  }

  const user = await User.create({ name, email: cleanEmail, password, phone, role: 'employer' });
  let company;
  try {
    company = await Company.create({
      ...pickCompany({ ...req.body, name: cleanName, phone, email: req.body.companyEmail || cleanEmail }),
      owner: user._id,
      createdBy: user._id,
      status: 'pending',
    });
  } catch (err) {
    await user.deleteOne(); // don't leave a half-created account behind
    throw err;
  }
  user.company = company._id;
  await user.save();

  if (process.env.ADMIN_NOTIFY_EMAIL) {
    sendLater({ to: process.env.ADMIN_NOTIFY_EMAIL, replyTo: user.email, ...templates.employerSignup({ user, company }) });
  }
  sendLater({ to: user.email, ...templates.employerWelcome({ name: user.name, company }) });

  res.status(201).json({ ...authPayload(user), companyStatus: company.status });
});

// GET /api/employer/company — company profile + quick numbers for the dashboard
const getMyCompany = asyncHandler(async (req, res) => {
  const company = req.company;
  const jobIds = await Job.find({ company: company._id }).distinct('_id');
  const [openJobs, applications, pending] = await Promise.all([
    Job.countDocuments({ company: company._id, ...Job.openFilter() }),
    Application.countDocuments({ job: { $in: jobIds } }),
    Application.countDocuments({ job: { $in: jobIds }, status: 'pending' }),
  ]);
  res.json({ ...company.toJSON(), stats: { jobs: jobIds.length, openJobs, applications, pendingApplications: pending } });
});

// PUT /api/employer/company — renaming also updates the company's jobs
const updateMyCompany = asyncHandler(async (req, res) => {
  const company = req.company;
  const changes = pickCompany(req.body);
  if (changes.name !== undefined) {
    if (!changes.name) throw new HttpError(400, 'Company name is required');
    const clash = await Company.exists({ _id: { $ne: company._id }, name: new RegExp(`^${escapeRegex(changes.name)}$`, 'i') });
    if (clash) throw new HttpError(400, 'Another company already uses this name');
  }
  company.set(changes);
  await company.save();
  await Job.updateMany(
    { company: company._id },
    { $set: { companyName: company.name, ...(changes.logo !== undefined ? { logo: company.logo } : {}) } }
  );
  res.json(company);
});

module.exports = { registerEmployer, getMyCompany, updateMyCompany };
