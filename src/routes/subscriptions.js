const express = require('express');
const router = express.Router();
const {
  createSubscription,
  getUserSubscriptions,
  getSignalPlanSubscribers,
  cancelSubscription,
  getSubscriptionStats
} = require('../controllers/subscriptions');
const { protect, authorize } = require('../middleware/auth');

// User routes
router.get('/my-subscriptions', protect, getUserSubscriptions);
router.post('/', protect, createSubscription);
router.put('/:subscriptionId/cancel', protect, cancelSubscription);

// Admin routes
router.get('/signal-plan/:signalPlanId/subscribers', protect, authorize('admin'), getSignalPlanSubscribers);
router.get('/stats/overview', protect, authorize('admin'), getSubscriptionStats);

module.exports = router;
