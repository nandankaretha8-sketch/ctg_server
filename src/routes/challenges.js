const express = require('express');
const router = express.Router();
const {
  getAllChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  getUserChallenges,
  getAdminChallenges,
  getUserMT5Account,
  getAllMT5Accounts,
  updateChallengeStatuses,
  triggerStatusUpdate,
  updateParticipant,
  getChallengeParticipants,
  syncAllParticipantsToLeaderboard
} = require('../controllers/challenges');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllChallenges);

// Protected routes (require authentication)
router.use(protect);

// User routes
router.get('/user/my-challenges', getUserChallenges);

// Admin routes (require admin role)
router.post('/', authorize('admin'), createChallenge);
router.get('/admin/my-challenges', authorize('admin'), getAdminChallenges);
router.get('/admin/mt5-accounts', authorize('admin'), getAllMT5Accounts);
router.post('/admin/update-statuses', authorize('admin'), triggerStatusUpdate);
router.post('/admin/sync-leaderboard', authorize('admin'), syncAllParticipantsToLeaderboard);

// Challenge-specific routes (must come after admin routes to avoid conflicts)
router.get('/:challengeId/participants', authorize('admin'), getChallengeParticipants);
router.put('/:challengeId/participants/:participantId', authorize('admin'), updateParticipant);
router.get('/:id/account', getUserMT5Account);
router.post('/:id/join', joinChallenge);
router.post('/:id/leave', leaveChallenge);
router.put('/:id', authorize('admin'), updateChallenge);
router.delete('/:id', authorize('admin'), deleteChallenge);
router.get('/:id', getChallengeById);

module.exports = router;