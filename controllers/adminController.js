const User = require('../models/User');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const Message = require('../models/Message');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [jobs, activeJobs, companies, applications, pending, users, unreadMessages, byStatus, recentApplications] = await Promise.all([
    Job.countDocuments(),
    Job.countDocuments({ isActive: true }),
    Company.countDocuments(),
    Application.countDocuments(),
    Application.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'candidate' }),
    Message.countDocuments({ isRead: false }),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('job', 'title companyName')
      .populate('applicant', 'name phone'),
  ]);

  res.json({
    jobs,
    activeJobs,
    companies,
    applications,
    pendingApplications: pending,
    users,
    unreadMessages,
    applicationsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    recentApplications,
  });
});

// GET /api/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const counts = await Application.aggregate([{ $group: { _id: '$applicant', count: { $sum: 1 } } }]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json(users.map((u) => ({ ...u.toJSON(), applications: byUser[String(u._id)] || 0 })));
});

// PUT /api/admin/users/:id/role
const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['candidate', 'admin'].includes(role)) throw new HttpError(400, 'Unknown role');
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json(user);
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  await Promise.all([
    Application.deleteMany({ applicant: user._id }),
    require('../models/SavedJob').deleteMany({ user: user._id }),
  ]);
  res.json({ message: 'User deleted' });
});

// GET /api/admin/messages
const getMessages = asyncHandler(async (req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }));
});

// PUT /api/admin/messages/:id   { isRead }
const updateMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { isRead: Boolean(req.body.isRead) }, { new: true });
  if (!msg) throw new HttpError(404, 'Message not found');
  res.json(msg);
});

// DELETE /api/admin/messages/:id
const deleteMessage = asyncHandler(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ message: 'Message deleted' });
});

module.exports = { getStats, getUsers, setUserRole, deleteUser, getMessages, updateMessage, deleteMessage };
