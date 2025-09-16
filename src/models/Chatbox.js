const mongoose = require('mongoose');

const chatboxSchema = new mongoose.Schema({
  signalPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalPlan',
    required: true,
    unique: true // One chatbox per signal plan
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderType: {
      type: String,
      enum: ['admin', 'user'],
      default: 'admin'
    },
    content: {
      type: String,
      required: [true, 'Please provide message content'],
      trim: true,
      maxlength: [2000, 'Message content cannot be more than 2000 characters']
    },
    messageType: {
      type: String,
      enum: ['signal', 'announcement', 'general'],
      default: 'signal'
    },
    signalData: {
      symbol: String,
      action: {
        type: String,
        enum: ['BUY', 'SELL']
      },
      entryPrice: Number,
      stopLoss: Number,
      takeProfit: Number,
      timeframe: String,
      riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH']
      }
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'file', 'link']
      },
      url: String,
      filename: String,
      size: Number
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscribers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }],
  settings: {
    allowUserMessages: {
      type: Boolean,
      default: false
    },
    autoDeleteMessages: {
      type: Boolean,
      default: false
    },
    messageRetentionDays: {
      type: Number,
      default: 30
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatboxSchema.index({ signalPlan: 1 });
chatboxSchema.index({ 'subscribers.user': 1 });
chatboxSchema.index({ 'subscribers.subscription': 1 });
chatboxSchema.index({ 'messages.createdAt': -1 });
chatboxSchema.index({ isActive: 1 });

// Virtual for subscriber count (now used as view count)
chatboxSchema.virtual('subscriberCount').get(function() {
  return this.viewCount;
});

// Ensure virtual fields are included in JSON output
chatboxSchema.set('toJSON', { virtuals: true });
chatboxSchema.set('toObject', { virtuals: true });

// Method to add subscriber
chatboxSchema.methods.addSubscriber = function(userId, subscriptionId) {
  // Check if user is already a subscriber
  const existingSubscriber = this.subscribers.find(
    sub => sub.user.toString() === userId.toString()
  );
  
  if (existingSubscriber) {
    // Reactivate if inactive
    if (!existingSubscriber.isActive) {
      existingSubscriber.isActive = true;
      existingSubscriber.joinedAt = new Date();
      existingSubscriber.subscription = subscriptionId;
    }
  } else {
    // Add new subscriber
    this.subscribers.push({
      user: userId,
      subscription: subscriptionId,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Method to increment view count
chatboxSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to remove subscriber
chatboxSchema.methods.removeSubscriber = function(userId) {
  const subscriberIndex = this.subscribers.findIndex(
    sub => sub.user.toString() === userId.toString()
  );
  
  if (subscriberIndex !== -1) {
    this.subscribers[subscriberIndex].isActive = false;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add message
chatboxSchema.methods.addMessage = function(messageData) {
  this.messages.push({
    ...messageData,
    createdAt: new Date()
  });
  
  // Keep only recent messages if auto-delete is enabled
  if (this.settings.autoDeleteMessages && this.settings.messageRetentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.messageRetentionDays);
    
    this.messages = this.messages.filter(
      msg => msg.createdAt > cutoffDate || msg.isPinned
    );
  }
  
  return this.save();
};

// Static method to get chatbox by signal plan
chatboxSchema.statics.getBySignalPlan = function(signalPlanId) {
  return this.findOne({ signalPlan: signalPlanId, isActive: true });
};

// Static method to get user's chatboxes
chatboxSchema.statics.getUserChatboxes = function(userId) {
  return this.find({
    'subscribers.user': userId,
    'subscribers.isActive': true,
    isActive: true
  }).populate('signalPlan', 'name description price duration');
};

module.exports = mongoose.model('Chatbox', chatboxSchema);
