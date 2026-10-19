const express = require('express');
const Job = require('../models/Job');
const Company = require('../models/Company');
const { SITE } = require('../utils/mailer');

const router = express.Router();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// GET /sitemap.xml — the frontend (Vercel) proxies its own /sitemap.xml here
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const now = new Date();
    const [jobs, companies] = await Promise.all([
      Job.find({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).select('_id updatedAt').lean(),
      Company.find().select('_id updatedAt').lean(),
    ]);
    const base = SITE();
    const url = (loc, lastmod, priority) =>
      `<url><loc>${esc(base + loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}<priority>${priority}</priority></url>`;

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      url('/', now, '1.0'),
      url('/jobs', now, '0.9'),
      url('/companies', null, '0.6'),
      url('/about', null, '0.3'),
      url('/contact', null, '0.3'),
      ...jobs.map((j) => url(`/jobs/${j._id}`, j.updatedAt, '0.8')),
      ...companies.map((c) => url(`/company/${c._id}`, c.updatedAt, '0.5')),
      '</urlset>',
    ].join('');

    res.set('Content-Type', 'application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
