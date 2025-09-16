const mongoose = require('mongoose');

const mentorshipPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a mentorship plan name'],
    trim: true,
    maxlength: [200, 'Plan name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a plan description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
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
  pricingType: {
    type: String,
    required: [true, 'Please add a pricing type'],
    enum: ['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time'],
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
    sessionFrequency: {
      type: String,
      default: 'Weekly'
    },
    courseDuration: {
      type: String,
      default: '7 days' // e.g., "7 days", "6 months", "3 weeks"
    },
    maxSessionsPerMonth: {
      type: Number,
      default: 4
    },
    mentorExperience: {
      type: String,
      default: '5+ years'
    },
    specialization: [{
      type: String,
      enum: ['forex', 'crypto', 'stocks', 'indices', 'commodities', 'options', 'futures']
    }],
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    languages: [{
      type: String,
      default: 'English'
    }],
    mentorName: {
      type: String,
      required: [true, 'Please add mentor name']
    },
    mentorBio: {
      type: String,
      maxlength: [500, 'Mentor bio cannot be more than 500 characters']
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
mentorshipPlanSchema.index({ isActive: 1, duration: 1 });
mentorshipPlanSchema.index({ 'subscribers.user': 1 });
mentorshipPlanSchema.index({ createdBy: 1 });

// Virtual to check if plan is full
mentorshipPlanSchema.virtual('isFull').get(function() {
  if (this.maxSubscribers === null) return false;
  return this.currentSubscribers >= this.maxSubscribers;
});

// Method to add subscriber
mentorshipPlanSchema.methods.addSubscriber = function(userId, paymentId, durationInDays) {
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
mentorshipPlanSchema.methods.removeSubscriber = function(userId) {
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
mentorshipPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ price: 1 });
};

// Static method to get user's active subscriptions
mentorshipPlanSchema.statics.getUserSubscriptions = function(userId) {
  return this.find({
    'subscribers.user': userId,
    'subscribers.status': 'active',
    'subscribers.expiresAt': { $gt: new Date() }
  });
};

module.exports = mongoose.model('MentorshipPlan', mentorshipPlanSchema);
