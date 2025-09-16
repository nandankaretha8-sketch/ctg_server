const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user ID']
  },
  signalPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalPlan',
    required: false
  },
  mentorshipPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentorshipPlan',
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: [true, 'Please provide a payment ID']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide the subscription amount']
  },
  duration: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
    required: [true, 'Please provide subscription duration']
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  // Mentorship-specific fields
  sessionCount: {
    type: Number,
    default: 0
  },
  maxSessions: {
    type: Number,
    default: 4 // per month
  },
  nextSessionDate: {
    type: Date,
    default: null
  },
  sessionHistory: [{
    date: Date,
    duration: Number, // minutes
    topic: String,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled']
    }
  }],
  metadata: {
    confirmoTransactionId: String,
    confirmoPaymentId: String,
    paymentMethod: String,
    currency: {
      type: String,
      default: 'USD'
    },
    subscriptionType: {
      type: String,
      enum: ['signal_plan', 'mentorship'],
      default: 'signal_plan'
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
subscriptionSchema.index({ user: 1, signalPlan: 1 });
subscriptionSchema.index({ user: 1, mentorshipPlan: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ signalPlan: 1, status: 1 });
subscriptionSchema.index({ mentorshipPlan: 1, status: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = null) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.autoRenew = false;
  return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renew = function(duration) {
  const now = new Date();
  let newEndDate;
  
  switch (duration) {
    case 'monthly':
      newEndDate = new Date(now.setMonth(now.getMonth() + 1));
      break;
    case 'quarterly':
      newEndDate = new Date(now.setMonth(now.getMonth() + 3));
      break;
    case 'semi_annual':
      newEndDate = new Date(now.setMonth(now.getMonth() + 6));
      break;
    case 'annual':
      newEndDate = new Date(now.setFullYear(now.getFullYear() + 1));
      break;
    default:
      throw new Error('Invalid duration');
  }
  
  this.endDate = newEndDate;
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
