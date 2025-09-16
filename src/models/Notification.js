const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['general', 'challenge', 'promotion', 'announcement'],
    default: 'general'
  },
  targetAudience: {
    type: String,
    required: true,
    enum: ['all', 'active', 'challenge_participants', 'premium', 'signal_plan_subscribers', 'specific_signal_plan', 'specific_competition'],
    default: 'all'
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledTime: {
    type: Date,
    required: function() {
      return this.isScheduled;
    }
  },
  sentAt: {
    type: Date
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  signalPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalPlan',
    required: function() {
      return this.targetAudience === 'specific_signal_plan';
    }
  },
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: function() {
      return this.targetAudience === 'specific_competition';
    }
  },
  // Push notification service specific fields
  pushService: {
    type: String,
    enum: ['fcm', 'apns', 'web-push'],
    default: 'fcm'
  },
  // Delivery statistics
  deliveryStats: {
    totalSent: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    openedCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    }
  },
  // Additional metadata
  metadata: {
    actionUrl: String,
    imageUrl: String,
    sound: {
      type: String,
      default: 'default'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    ttl: {
      type: Number,
      default: 86400 // 24 hours in seconds
    }
  },
  // Error tracking
  errors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ status: 1, scheduledTime: 1 });
notificationSchema.index({ sentBy: 1, createdAt: -1 });
notificationSchema.index({ type: 1, targetAudience: 1 });

// Virtual for formatted delivery rate
notificationSchema.virtual('deliveryRate').get(function() {
  if (this.deliveryStats.totalSent === 0) return 0;
  return Math.round((this.deliveryStats.deliveredCount / this.deliveryStats.totalSent) * 100);
});

// Virtual for formatted open rate
notificationSchema.virtual('openRate').get(function() {
  if (this.deliveryStats.deliveredCount === 0) return 0;
  return Math.round((this.deliveryStats.openedCount / this.deliveryStats.deliveredCount) * 100);
});

// Method to update delivery stats
notificationSchema.methods.updateDeliveryStats = function(stats) {
  this.deliveryStats = { ...this.deliveryStats, ...stats };
  return this.save();
};

// Method to add error
notificationSchema.methods.addError = function(error, details = {}) {
  this.errors.push({ error, details });
  return this.save();
};

// Static method to get notifications by status
notificationSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get scheduled notifications ready to send
notificationSchema.statics.getScheduledReady = function() {
  return this.find({
    status: 'scheduled',
    scheduledTime: { $lte: new Date() }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
