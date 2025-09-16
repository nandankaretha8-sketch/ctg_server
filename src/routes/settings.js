const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../services/cloudinaryService');
const {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadMentorPhoto,
  uploadFavicon,
  deleteLogo,
  deleteMentorPhoto,
  deleteFavicon
} = require('../controllers/settings');

// Public route to get settings (for frontend display)
router.get('/', getSettings);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

// Update general settings
router.put('/', updateSettings);

// Upload logo
router.post('/logo', uploadSingle, uploadLogo);

// Upload mentor photo
router.post('/mentor-photo', uploadSingle, uploadMentorPhoto);

// Upload favicon
router.post('/favicon', uploadSingle, uploadFavicon);

// Delete logo
router.delete('/logo', deleteLogo);

// Delete mentor photo
router.delete('/mentor-photo', deleteMentorPhoto);

// Delete favicon
router.delete('/favicon', deleteFavicon);

module.exports = router;
