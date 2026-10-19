const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');
const { sendLater, templates, SITE } = require('../utils/mailer');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Shape returned to the frontend after login/register/profile update
const authPayload = (user) => ({ ...user.toJSON(), token: generateToken(user._id) });

// Fields a candidate can edit on their own profile
const PROFILE_FIELDS = ['name', 'phone', 'location', 'nationality', 'skills', 'experienceYears', 'languages', 'bio', 'resume', 'resumeName', 'profilePhoto'];

const toList = (v) =>
  Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// POST /api/auth/register — public sign-up is always a candidate account
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new HttpError(400, 'That email is already registered');

  const user = await User.create({ name, email, password, phone, role: 'candidate' });
  sendLater({ to: user.email, ...templates.welcome({ name: user.name }) });
  res.status(201).json(authPayload(user));
});

// POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Enter your email and password');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Email or password is incorrect');

  res.json(authPayload(user));
});

// GET /api/auth/profile
const getProfile = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  PROFILE_FIELDS.forEach((field) => {
    if (req.body[field] === undefined) return;
    user[field] = ['skills', 'languages'].includes(field) ? toList(req.body[field]) : req.body[field];
  });
  await user.save();
  res.json(authPayload(user));
});

// PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new HttpError(400, 'Enter your current and new password');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw new HttpError(400, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

// POST /api/auth/forgot-password  { email }
// Always answers the same way so nobody can probe which emails are registered.
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!email) throw new HttpError(400, 'Enter your email address');

  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save({ validateBeforeSave: false });
    sendLater({ to: user.email, ...templates.passwordReset({ name: user.name, url: `${SITE()}/reset-password/${token}` }) });
  }
  res.json({ message: 'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.' });
});

// POST /api/auth/reset-password/:token  { password }
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) throw new HttpError(400, 'Use a password with at least 6 characters');

  const user = await User.findOne({
    resetPasswordToken: hashToken(req.params.token || ''),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Ask for a new one.');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Log them straight in
  res.json(authPayload(user));
});

module.exports = { registerUser, loginUser, getProfile, updateProfile, changePassword, forgotPassword, resetPassword };
