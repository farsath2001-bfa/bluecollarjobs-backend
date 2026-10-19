const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    // candidate = job seeker, employer = company account, admin = site owner.
    // Older accounts were saved as "jobseeker"; read and write them as "candidate".
    role: {
      type: String,
      enum: ['candidate', 'employer', 'admin'],
      default: 'candidate',
      set: (v) => (['admin', 'employer'].includes(v) ? v : 'candidate'),
      get: (v) => (['admin', 'employer'].includes(v) ? v : 'candidate'),
    },
    // Employers: the company this account manages
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

    // Candidate profile — what employers see on an application
    phone: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    languages: { type: [String], default: [] },
    bio: { type: String, maxlength: 600, default: '' },
    resume: { type: String, default: '' }, // URL (uploaded to Cloudinary, or a Drive/Dropbox link)
    resumeName: { type: String, default: '' }, // original file name of an uploaded CV
    profilePhoto: { type: String, default: '' },

    // Forgot-password flow: only a SHA-256 hash of the emailed token is stored
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Older accounts may still say "jobseeker" in the database; fix them on the next save
userSchema.pre('validate', function normalizeRole() {
  if (!['admin', 'employer'].includes(this.role)) this.role = 'candidate';
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function matchPassword(entered) {
  return bcrypt.compare(entered, this.password);
};

// Never leak the password hash
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
