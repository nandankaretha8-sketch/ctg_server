const express = require('express');
const router = express.Router();
const { getVisitorStats, getVisitorAnalytics, getRealTimeVisitors } = require('../controllers/visitors');
const { protect, authorize } = require('../middleware/auth');

// All visitor routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Get visitor statistics
router.get('/stats', getVisitorStats);

// Get visitor analytics dashboard data
router.get('/analytics', getVisitorAnalytics);

// Get real-time visitor data
router.get('/realtime', getRealTimeVisitors);

module.exports = router;
