const mongoose = require('mongoose');

const PropFirmServiceChatSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropFirmService',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
PropFirmServiceChatSchema.index({ service: 1, createdAt: 1 });

module.exports = mongoose.model('PropFirmServiceChat', PropFirmServiceChatSchema);
