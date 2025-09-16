const express = require('express');
const router = express.Router();
const {
  getSignalPlans,
  getSignalPlan,
  createSignalPlan,
  updateSignalPlan,
  deleteSignalPlan,
  createSignalPlanPayment,
  getUserSubscriptions,
  cancelSubscription
} = require('../controllers/signalPlans');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getSignalPlans);
router.get('/:id', getSignalPlan);

// Protected routes (require authentication)
router.use(protect);

// User subscription routes
router.get('/user/subscriptions', getUserSubscriptions);
router.post('/:planId/cancel', cancelSubscription);
router.post('/:planId/payment', createSignalPlanPayment);

// Admin routes (require admin role)
router.post('/', authorize('admin'), createSignalPlan);
router.put('/:id', authorize('admin'), updateSignalPlan);
router.delete('/:id', authorize('admin'), deleteSignalPlan);

module.exports = router;
