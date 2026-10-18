const mongoose = require('mongoose');

const STATUSES = ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'];

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },

    // Snapshot of what the candidate sent, so it survives later profile edits
    phone: { type: String, default: '' },
    coverLetter: { type: String, maxlength: 1500, default: '' },
    resume: { type: String, default: '' },
    availableFrom: { type: String, default: '' }, // "Immediately", "2 weeks"…
    hasUaeVisa: { type: Boolean, default: false },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Application', applicationSchema);
