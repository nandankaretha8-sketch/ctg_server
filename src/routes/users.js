const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  updateAllUsersStats,
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), getUsers);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, getUser);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
], updateUser);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), deleteUser);

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private
router.get('/:id/stats', protect, getUserStats);

// @desc    Update all users' trading stats
// @route   POST /api/users/update-all-stats
// @access  Private/Admin
router.post('/update-all-stats', protect, authorize('admin'), updateAllUsersStats);

module.exports = router;
