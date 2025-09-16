const express = require('express');
const { getLeaderboard, getUserRank, updateMT5Data, getLeaderboardStats, updateLeaderboardEntry, deleteLeaderboardEntry, getAllLeaderboardEntries } = require('../controllers/leaderboard');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
router.get('/', getLeaderboard);

// @desc    Get user rank
// @route   GET /api/leaderboard/rank
// @access  Private
router.get('/rank', protect, getUserRank);

// @desc    Manually trigger MT5 data update
// @route   POST /api/leaderboard/update-mt5
// @access  Private (Admin only)
router.post('/update-mt5', protect, updateMT5Data);

// @desc    Get leaderboard statistics
// @route   GET /api/leaderboard/stats
// @access  Public
router.get('/stats', getLeaderboardStats);

// @desc    Get all leaderboard entries for admin management
// @route   GET /api/leaderboard/admin/all
// @access  Private (Admin only)
router.get('/admin/all', protect, getAllLeaderboardEntries);

// @desc    Update leaderboard entry
// @route   PUT /api/leaderboard/:id
// @access  Private (Admin only)
router.put('/:id', protect, updateLeaderboardEntry);

// @desc    Delete leaderboard entry
// @route   DELETE /api/leaderboard/:id
// @access  Private (Admin only)
router.delete('/:id', protect, deleteLeaderboardEntry);

module.exports = router;
