const express = require('express');
const router = express.Router();
const {
  getAllMentorshipPlans,
  getMentorshipPlan,
  createMentorshipPlan,
  updateMentorshipPlan,
  deleteMentorshipPlan,
  getUserMentorships,
  getAllMentorshipSubscriptions,
  subscribeToMentorship,
  unsubscribeFromMentorship,
  scheduleMentorshipSession,
  updateMentorshipSession,
  deleteMentorshipSession
} = require('../controllers/mentorshipPlans');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllMentorshipPlans);

// Admin routes (require admin authentication) - must come before /:id route
router.get('/subscriptions', protect, authorize('admin'), getAllMentorshipSubscriptions);

// Public routes
router.get('/:id', getMentorshipPlan);

// Protected routes (require authentication)
router.get('/user/subscriptions', protect, getUserMentorships);
router.post('/:planId/subscribe', protect, subscribeToMentorship);
router.delete('/:planId/unsubscribe', protect, unsubscribeFromMentorship);

// Admin routes (require admin authentication)
router.post('/', protect, authorize('admin'), createMentorshipPlan);
router.put('/:id', protect, authorize('admin'), updateMentorshipPlan);
router.delete('/:id', protect, authorize('admin'), deleteMentorshipPlan);
router.post('/:planId/schedule-session', protect, authorize('admin'), scheduleMentorshipSession);
router.put('/:planId/sessions/:sessionId', protect, authorize('admin'), updateMentorshipSession);
router.delete('/:planId/sessions/:sessionId', protect, authorize('admin'), deleteMentorshipSession);

module.exports = router;
