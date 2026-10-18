/**
 * Seed the database with companies, sample jobs and an admin account.
 *
 *   npm run seed          → adds companies + admin; adds sample jobs only if there are none yet
 *   npm run seed:reset    → DELETES all jobs, applications and saved jobs, then re-adds samples
 *   npm run create-admin  → only creates/promotes the admin from ADMIN_EMAIL / ADMIN_PASSWORD
 */
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Company = require('./models/Company');
const Job = require('./models/Job');
const Application = require('./models/Application');
const SavedJob = require('./models/SavedJob');

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const ADMIN_ONLY = args.includes('--admin-only');

const companies = [
  { name: 'Emirates Transport', logo: 'emirates.png', location: 'Dubai', industry: 'Transportation', isVerified: true,
    description: 'Government-owned transport company running school buses, taxis, logistics and vehicle leasing across the UAE.' },
  { name: 'Talabat', logo: 'talabat.png', location: 'Dubai', industry: 'Food delivery', isVerified: true,
    description: 'Food and grocery delivery platform with riders working across every emirate.' },
  { name: 'Al Noor Technical Services', logo: 'alnoor.png', location: 'Sharjah', industry: 'Technical services', isVerified: true,
    description: 'MEP, electrical and maintenance contractor for villas, offices and residential towers.' },
  { name: 'Bright Facility Management', logo: 'bright.png', location: 'Dubai', industry: 'Facility management',
    description: 'Cleaning, housekeeping and soft services for malls, hospitals and office buildings.' },
  { name: 'Dewa Services', logo: 'dewa.png', location: 'Abu Dhabi', industry: 'Utilities & plumbing',
    description: 'Plumbing, water network and utility maintenance teams.' },
  { name: 'EAS Security', logo: 'eas.png', location: 'Dubai', industry: 'Security services', isVerified: true,
    description: 'SIRA-licensed guarding company covering malls, residential communities and events.' },
  { name: 'Lazord', logo: 'lazord.png', location: 'Umm Al Quwain', industry: 'Real estate & maintenance',
    description: 'Property management company with in-house maintenance and front-desk teams.' },
  { name: 'ABC Cargo', logo: 'abc.png', location: 'Ajman', industry: 'Cargo & logistics',
    description: 'Freight forwarding, warehousing and last-mile delivery.' },
];

const jobs = [
  { title: 'Light Vehicle Driver', company: 'Emirates Transport', category: 'Driver', location: 'Dubai', salary: 'AED 2,500 / month', jobType: 'Full-time',
    description: 'Drive company vehicles for staff transport and deliveries within Dubai. Keep the vehicle clean, follow routes and log daily trips.',
    requirements: ['Valid UAE light vehicle licence', '2+ years UAE driving experience', 'Knows Dubai roads'], benefits: ['Accommodation', 'Visa', 'Medical insurance'], vacancies: 5 },
  { title: 'Heavy Bus Driver', company: 'Emirates Transport', category: 'Driver', location: 'Abu Dhabi', salary: 'AED 3,800 / month', jobType: 'Full-time',
    description: 'School and staff bus driver. Morning and afternoon shifts with a long break in between.',
    requirements: ['UAE heavy bus licence', 'Clean driving record', 'Basic English'], benefits: ['Accommodation', 'Transport', 'Visa', 'Annual ticket'], vacancies: 8 },
  { title: 'Electrician', company: 'Al Noor Technical Services', category: 'Electrician', location: 'Sharjah', salary: 'AED 3,000 / month', jobType: 'Full-time',
    description: 'Install and repair wiring, DB panels, lighting and sockets in villas and apartments.',
    requirements: ['3+ years experience', 'Can read electrical drawings', 'Own basic tools'], benefits: ['Accommodation', 'Transport', 'Overtime pay'], vacancies: 3 },
  { title: 'AC Technician', company: 'Lazord', category: 'Technician', location: 'Umm Al Quwain', salary: 'AED 2,800 / month', jobType: 'Contract',
    description: 'Install, service and repair split and ducted AC units and refrigeration systems for residential buildings.',
    requirements: ['HVAC experience in UAE preferred', 'Gas charging and leak testing'], benefits: ['Accommodation', 'Transport'], vacancies: 2 },
  { title: 'Facility Cleaner', company: 'Bright Facility Management', category: 'Cleaning', location: 'Dubai', salary: 'AED 1,800 / month', jobType: 'Full-time',
    description: 'Daily cleaning of a shopping mall: floors, washrooms and common areas. Rotating 9-hour shifts.',
    requirements: ['Physically fit', 'Mall or hotel cleaning experience is a plus'], benefits: ['Accommodation', 'Transport', 'Visa', 'Food allowance'], vacancies: 15 },
  { title: 'Housekeeping Attendant', company: 'Bright Facility Management', category: 'Cleaning', location: 'Abu Dhabi', salary: 'AED 1,700 / month', jobType: 'Full-time',
    description: 'Room and corridor housekeeping for a hospital staff residence.',
    requirements: ['Attention to detail', 'Basic English or Arabic'], benefits: ['Accommodation', 'Transport', 'Visa'], vacancies: 6 },
  { title: 'Plumber', company: 'Dewa Services', category: 'Plumber', location: 'Abu Dhabi', salary: 'AED 2,800 / month', jobType: 'Full-time',
    description: 'Fix leaks, install pipes, water heaters and bathroom fittings for residential and commercial clients.',
    requirements: ['3+ years plumbing experience', 'PPR and copper pipe work'], benefits: ['Accommodation', 'Transport', 'Visa'], vacancies: 4 },
  { title: 'Security Guard', company: 'EAS Security', category: 'Security', location: 'Dubai', salary: 'AED 2,200 / month', jobType: 'Full-time',
    description: 'Guard duty at a large mall: access control, patrols and incident reporting. 12-hour shifts, 6 days a week.',
    requirements: ['SIRA certificate (or willing to get one)', 'Height 170 cm+', 'Good English'], benefits: ['Accommodation', 'Transport', 'Visa', 'Uniform'], vacancies: 10 },
  { title: 'Delivery Rider', company: 'Talabat', category: 'Delivery', location: 'Dubai', salary: 'AED 2,000 + incentives', jobType: 'Full-time',
    description: 'Deliver food and grocery orders by motorbike in your assigned zone. Bike and fuel provided.',
    requirements: ['UAE motorbike licence', 'Smartphone', 'Knows Google Maps'], benefits: ['Bike provided', 'Fuel card', 'Visa'], vacancies: 25 },
  { title: 'Receptionist', company: 'Lazord', category: 'Receptionist', location: 'Abu Dhabi', salary: 'AED 3,000 / month', jobType: 'Contract',
    description: 'Greet residents and visitors, issue visitor passes, answer calls and keep the lobby log.',
    requirements: ['Good spoken English', 'Basic computer skills'], benefits: ['Transport'], vacancies: 1 },
  { title: 'Mason', company: 'Al Noor Technical Services', category: 'Construction', location: 'Dubai', salary: 'AED 1,900 + accommodation', jobType: 'Contract',
    description: 'Blockwork, plastering and tiling on residential villa projects.',
    requirements: ['2+ years site experience', 'Can work outdoors'], benefits: ['Accommodation', 'Transport', 'Overtime pay'], vacancies: 6 },
  { title: 'Warehouse Helper', company: 'ABC Cargo', category: 'Warehouse', location: 'Ajman', salary: 'AED 1,600 / month', jobType: 'Full-time',
    description: 'Load and unload trucks, pick and pack orders, keep the warehouse tidy.',
    requirements: ['Able to lift 25 kg', 'Forklift licence is a plus'], benefits: ['Accommodation', 'Transport', 'Visa'], vacancies: 8 },
  { title: 'Cargo Driver (3-ton)', company: 'ABC Cargo', category: 'Driver', location: 'Sharjah', salary: 'AED 3,200 / month', jobType: 'Full-time',
    description: 'Drive a 3-ton pickup for deliveries between Sharjah, Dubai and Ajman.',
    requirements: ['UAE light/heavy vehicle licence', '2+ years UAE experience'], benefits: ['Accommodation', 'Visa'], vacancies: 3 },
];

const ensureAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Site Admin' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account.');
    return;
  }
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Promoted ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`✅ Admin ${ADMIN_EMAIL} already exists`);
    }
    return;
  }
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`✅ Created admin ${ADMIN_EMAIL}`);
};

const run = async () => {
  await connectDB();
  await ensureAdmin();
  if (ADMIN_ONLY) return;

  // Companies: upsert by name so re-running is safe
  const byName = {};
  for (const c of companies) {
    const doc = await Company.findOneAndUpdate({ name: c.name }, { $setOnInsert: c }, { upsert: true, new: true });
    byName[c.name] = doc;
  }
  console.log(`✅ ${companies.length} companies ready`);

  if (RESET) {
    await Promise.all([Job.deleteMany({}), Application.deleteMany({}), SavedJob.deleteMany({})]);
    console.log('🧹 Cleared jobs, applications and saved jobs');
  }

  const jobCount = await Job.countDocuments();
  if (jobCount > 0) {
    console.log(`ℹ️  ${jobCount} jobs already exist — not adding samples (use --reset to replace them).`);
    return;
  }

  const admin = await User.findOne({ role: 'admin' });
  for (const j of jobs) {
    const company = byName[j.company];
    await new Job({ ...j, company: company._id, companyName: company.name, logo: company.logo, postedBy: admin?._id }).save();
  }
  console.log(`✅ Added ${jobs.length} sample jobs`);
};

run()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
