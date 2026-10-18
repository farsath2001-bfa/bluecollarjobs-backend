const mongoose = require('mongoose');

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary'];

// Accept "full-time", "FULL TIME", "contract" etc. and store the canonical value
const normalizeJobType = (v) => {
  if (!v) return v;
  const key = String(v).toLowerCase().replace(/[\s_]+/g, '-');
  return JOB_TYPES.find((t) => t.toLowerCase() === key) || v;
};

// Pull the first number out of "AED 2,500" / "1900 + Accommodation" for filtering/sorting
const parseSalary = (s) => {
  const m = String(s || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Job title is required'], trim: true, maxlength: 100 },
    description: { type: String, required: [true, 'Job description is required'] },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true },

    // Company: linked record when available; name/logo kept on the job for fast listing
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName: { type: String, required: [true, 'Company name is required'], trim: true },
    logo: { type: String, default: '' },

    salary: { type: String, default: '' }, // shown as written, e.g. "AED 2,500 + accommodation"
    salaryMin: { type: Number }, // derived from salary
    jobType: { type: String, enum: JOB_TYPES, default: 'Full-time', set: normalizeJobType },

    requirements: { type: [String], default: [] },
    benefits: { type: [String], default: [] }, // e.g. Accommodation, Transport, Visa
    vacancies: { type: Number, min: 1, default: 1 },
    contactPhone: { type: String, default: '' },

    applicantsCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

jobSchema.pre('save', function setSalaryMin() {
  if (this.isModified('salary')) this.salaryMin = parseSalary(this.salary);
});

jobSchema.index({ isActive: 1, createdAt: -1 });
jobSchema.index({ category: 1 });

jobSchema.statics.JOB_TYPES = JOB_TYPES;
jobSchema.statics.parseSalary = parseSalary;

module.exports = mongoose.model('Job', jobSchema);
