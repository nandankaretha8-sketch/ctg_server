const express = require('express');
const router = express.Router();
const {
  getAllSupportTickets,
  getUserSupportTickets,
  getSupportTicket,
  createSupportTicket,
  addMessage,
  updateSupportTicket,
  deleteSupportTicket,
  getSupportStats
} = require('../controllers/support');
const { protect, authorize } = require('../middleware/auth');

// Public routes (none for support system)

// User routes
router.get('/my-tickets', protect, getUserSupportTickets);
router.get('/:id', protect, getSupportTicket);
router.post('/', protect, createSupportTicket);
router.post('/:id/messages', protect, addMessage);

// Admin routes
router.get('/', protect, authorize('admin'), getAllSupportTickets);
router.put('/:id', protect, authorize('admin'), updateSupportTicket);
router.delete('/:id', protect, authorize('admin'), deleteSupportTicket);
router.get('/stats/overview', protect, authorize('admin'), getSupportStats);

module.exports = router;
