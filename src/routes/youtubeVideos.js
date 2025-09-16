const express = require('express');
const { body } = require('express-validator');
const {
  getYouTubeVideos,
  getAdminYouTubeVideos,
  createYouTubeVideo,
  updateYouTubeVideo,
  deleteYouTubeVideo,
  toggleVideoStatus
} = require('../controllers/youtubeVideos');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all active YouTube videos
// @route   GET /api/youtube-videos
// @access  Public
router.get('/', getYouTubeVideos);

// @desc    Get all YouTube videos (admin)
// @route   GET /api/youtube-videos/admin
// @access  Private/Admin
router.get('/admin', protect, authorize('admin'), getAdminYouTubeVideos);

// @desc    Create new YouTube video
// @route   POST /api/youtube-videos
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('url')
    .trim()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters')
], createYouTubeVideo);

// @desc    Update YouTube video
// @route   PUT /api/youtube-videos/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters')
], updateYouTubeVideo);

// @desc    Delete YouTube video
// @route   DELETE /api/youtube-videos/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), deleteYouTubeVideo);

// @desc    Toggle video active status
// @route   PATCH /api/youtube-videos/:id/toggle
// @access  Private/Admin
router.patch('/:id/toggle', protect, authorize('admin'), toggleVideoStatus);

module.exports = router;
