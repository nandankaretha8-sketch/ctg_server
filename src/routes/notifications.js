const express = require('express');
const router = express.Router();
const {
  getAllNotifications,
  sendNotification,
  deleteNotification,
  getNotificationStats
} = require('../controllers/notifications');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// GET /api/notifications - Get all notifications
router.get('/', getAllNotifications);

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', getNotificationStats);

// POST /api/notifications/send - Create and send notification
router.post('/send', sendNotification);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;
