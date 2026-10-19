const jwt = require('jsonwebtoken');
const User = require('../models/User');

const readToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Requires a valid JWT. Attaches req.user.
const protect = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
};

// Attaches req.user when a valid token is present, but never blocks.
const optionalAuth = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    /* ignore bad tokens on public routes */
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Admins only' });
};

const Company = require('../models/Company');

// Admins, or employers (whose company is attached as req.company). Controllers scope employers to their own data.
const adminOrEmployer = async (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  if (req.user?.role !== 'employer') return res.status(403).json({ message: 'Employers only' });
  req.company = req.user.company ? await Company.findById(req.user.company) : null;
  if (!req.company) return res.status(403).json({ message: 'Your company profile is missing. Contact us.' });
  return next();
};

// Employers whose company the admin has approved (admins always pass)
const approvedEmployer = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  if (req.company?.status === 'approved') return next();
  const message =
    req.company?.status === 'suspended'
      ? 'Your employer account is suspended. Contact us for help.'
      : 'Your employer account is waiting for approval. You can post jobs once it is approved.';
  return res.status(403).json({ message });
};

module.exports = { protect, optionalAuth, adminOnly, adminOrEmployer, approvedEmployer };
