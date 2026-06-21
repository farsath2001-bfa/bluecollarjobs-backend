const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  logo:        { type: String },           // stores image filename
  location:    { type: String },
  website:     { type: String },
  industry:    { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);