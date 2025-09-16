const express = require('express');
const {
  getFooterSettings,
  getFooterSettingsAdmin,
  createFooterSettings,
  updateFooterSettings,
  deleteFooterSettings,
  toggleFooterSettingsStatus
} = require('../controllers/footerSettings');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getFooterSettings) // Public route for footer data
  .post(protect, authorize('admin'), createFooterSettings);

router.route('/admin')
  .get(protect, authorize('admin'), getFooterSettingsAdmin); // Admin route for managing settings

router.route('/:id')
  .put(protect, authorize('admin'), updateFooterSettings)
  .delete(protect, authorize('admin'), deleteFooterSettings);

router.route('/:id/toggle')
  .patch(protect, authorize('admin'), toggleFooterSettingsStatus);

module.exports = router;
