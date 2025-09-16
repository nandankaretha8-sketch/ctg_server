const express = require('express');
const router = express.Router();
const {
  getChatMessages,
  sendChatMessage
} = require('../controllers/mentorshipChat');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.get('/:planId', protect, getChatMessages);
router.post('/:planId', protect, sendChatMessage);

module.exports = router;
