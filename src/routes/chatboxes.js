const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getChatboxMessages,
  sendMessage,
  getChatboxParticipants,
  getChatbox
} = require('../controllers/chatboxes');

const router = express.Router();

router.route('/plan/:planId/messages')
  .get(protect, getChatboxMessages)
  .post(protect, sendMessage);

router.route('/plan/:planId/participants')
  .get(protect, getChatboxParticipants);

router.route('/plan/:planId')
  .get(protect, getChatbox);

module.exports = router;
