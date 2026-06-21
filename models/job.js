const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  location:    { type: String, required: true },
  salary:      { type: String },
  jobType:     { type: String, enum: ['full-time','part-time','contract'], default: 'full-time' },
  companyName: { type: String },        // ✅ plain text company name
  logo:        { type: String },        // ✅ logo filename
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);