const express = require('express');
const router = express.Router();
const {
  getPropFirmPackages,
  getPropFirmPackage,
  createPropFirmPackage,
  updatePropFirmPackage,
  deletePropFirmPackage,
  getPackageStats
} = require('../controllers/propFirmPackages');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getPropFirmPackages);
router.get('/:id', getPropFirmPackage);

// Protected routes (require authentication)
router.use(protect);

// Admin routes (require admin role)
router.post('/', authorize('admin'), createPropFirmPackage);
router.put('/:id', authorize('admin'), updatePropFirmPackage);
router.delete('/:id', authorize('admin'), deletePropFirmPackage);
router.get('/stats/overview', authorize('admin'), getPackageStats);

module.exports = router;
