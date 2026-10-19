const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Company name is required'], unique: true, trim: true },
    description: { type: String, default: '' },
    // Either a bundled logo key (e.g. "talabat.png") or a full image URL
    logo: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    industry: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Employer accounts: the user who manages this company, and whether the admin has approved it.
    // Companies added by the admin have no owner and are approved.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'approved' },
    statusNote: { type: String, default: '' }, // reason shown to the employer when suspended
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
