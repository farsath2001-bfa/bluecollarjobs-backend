const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Shape returned to the frontend after login/register/profile update
const authPayload = (user) => ({ ...user.toJSON(), token: generateToken(user._id) });

// Fields a candidate can edit on their own profile
const PROFILE_FIELDS = ['name', 'phone', 'location', 'nationality', 'skills', 'experienceYears', 'languages', 'bio', 'resume', 'profilePhoto'];

const toList = (v) =>
  Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// POST /api/auth/register — public sign-up is always a candidate account
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new HttpError(400, 'That email is already registered');

  const user = await User.create({ name, email, password, phone, role: 'candidate' });
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

module.exports = { registerUser, loginUser, getProfile, updateProfile, changePassword };
