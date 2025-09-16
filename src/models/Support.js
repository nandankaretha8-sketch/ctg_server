const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user ID']
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'feature_request', 'bug_report'],
    default: 'general'
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderType: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
      maxlength: [2000, 'Message cannot be more than 2000 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      url: String
    }]
  }],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
supportSchema.index({ user: 1, status: 1 });
supportSchema.index({ assignedTo: 1, status: 1 });
supportSchema.index({ lastMessage: -1 });
supportSchema.index({ createdAt: -1 });

// Virtual for unread message count
supportSchema.virtual('unreadCount', {
  ref: 'Support',
  localField: '_id',
  foreignField: '_id',
  count: true,
  match: { 'messages.isRead': false, 'messages.senderType': 'user' }
});

// Method to add a message
supportSchema.methods.addMessage = function(senderId, senderType, message, attachments = []) {
  this.messages.push({
    sender: senderId,
    senderType: senderType,
    message: message,
    attachments: attachments,
    timestamp: new Date()
  });
  this.lastMessage = new Date();
  return this.save();
};

// Method to mark messages as read
supportSchema.methods.markAsRead = function(userType) {
  this.messages.forEach(msg => {
    if (msg.senderType !== userType) {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Method to get unread count for a user type
supportSchema.methods.getUnreadCount = function(userType) {
  return this.messages.filter(msg => 
    msg.senderType !== userType && !msg.isRead
  ).length;
};

module.exports = mongoose.model('Support', supportSchema);
