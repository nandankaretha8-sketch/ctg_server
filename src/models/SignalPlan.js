const mongoose = require('mongoose');

const signalPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a plan name'],
    trim: true,
    maxlength: [200, 'Plan name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  originalPrice: {
    type: Number,
    required: false,
    min: [0, 'Original price cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Please add a plan price'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: String,
    required: [true, 'Please add a plan duration'],
    enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
    default: 'monthly'
  },
  features: [{
    type: String,
    required: true,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  maxSubscribers: {
    type: Number,
    default: null // null means unlimited
  },
  currentSubscribers: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscribers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscribedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
  }],
  metadata: {
    signalFrequency: {
      type: String,
      default: 'Daily'
    },
    signalTypes: [{
      type: String,
      enum: ['forex', 'crypto', 'stocks', 'indices', 'commodities']
    }],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
signalPlanSchema.index({ isActive: 1, duration: 1 });
signalPlanSchema.index({ 'subscribers.user': 1 });
signalPlanSchema.index({ createdBy: 1 });

// Virtual for checking if plan is full
signalPlanSchema.virtual('isFull').get(function() {
  if (this.maxSubscribers === null) return false;
  return this.currentSubscribers >= this.maxSubscribers;
});

// Method to add subscriber
signalPlanSchema.methods.addSubscriber = function(userId, paymentId, durationInDays) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationInDays);
  
  this.subscribers.push({
    user: userId,
    paymentId: paymentId,
    expiresAt: expiresAt,
    status: 'active'
  });
  
  this.currentSubscribers += 1;
  return this.save();
};

// Method to remove subscriber
signalPlanSchema.methods.removeSubscriber = function(userId) {
  const subscriberIndex = this.subscribers.findIndex(
    sub => sub.user.toString() === userId.toString() && sub.status === 'active'
  );
  
  if (subscriberIndex !== -1) {
    this.subscribers[subscriberIndex].status = 'cancelled';
    this.currentSubscribers = Math.max(0, this.currentSubscribers - 1);
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to get active plans
signalPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ price: 1 });
};

// Static method to get user's active subscriptions
signalPlanSchema.statics.getUserSubscriptions = function(userId) {
  return this.find({
    'subscribers.user': userId,
    'subscribers.status': 'active',
    'subscribers.expiresAt': { $gt: new Date() }
  });
};

module.exports = mongoose.model('SignalPlan', signalPlanSchema);
