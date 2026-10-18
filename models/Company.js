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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
