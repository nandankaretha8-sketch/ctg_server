const express = require('express');
const router = express.Router();
const {
  createPropFirmService,
  getUserPropFirmServices,
  getAllPropFirmServices,
  getPropFirmService,
  updatePropFirmService,
  updateServicePerformance,
  addServiceNote,
  getServiceStats,
  getServiceChat,
  sendServiceMessage
} = require('../controllers/propFirmServices');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// User routes
router.get('/my-services', getUserPropFirmServices);
router.post('/', createPropFirmService);
router.get('/:id', getPropFirmService);
router.get('/:id/chat', getServiceChat);
router.post('/:id/chat', sendServiceMessage);

// Admin routes
router.get('/', authorize('admin'), getAllPropFirmServices);
router.put('/:id', authorize('admin'), updatePropFirmService);
router.put('/:id/performance', authorize('admin'), updateServicePerformance);
router.post('/:id/notes', addServiceNote);
router.get('/stats/overview', authorize('admin'), getServiceStats);

module.exports = router;
