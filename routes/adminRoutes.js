const express = require('express');
const {
  getStats, getUsers, setUserRole, deleteUser, getMessages, updateMessage, deleteMessage,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);
router.get('/messages', getMessages);
router.put('/messages/:id', updateMessage);
router.delete('/messages/:id', deleteMessage);

module.exports = router;
