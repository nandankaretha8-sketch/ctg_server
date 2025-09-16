const express = require('express');
const router = express.Router();
const {
  getMentorshipChatbox,
  sendMessage,
  getMessages,
  pinMessage,
  scheduleSession,
  getSessionHistory
} = require('../controllers/mentorshipChatboxes');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.get('/:planId', protect, getMentorshipChatbox);
router.post('/:planId/messages', protect, sendMessage);
router.get('/:planId/messages', protect, getMessages);
router.post('/:planId/messages/:messageId/pin', protect, pinMessage);
router.post('/:planId/sessions', protect, scheduleSession);
router.get('/:planId/sessions', protect, getSessionHistory);

module.exports = router;
