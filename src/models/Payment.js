const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: false // Not required for signal plan payments
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalPlan',
    required: false // Not required for challenge payments
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Stripe fields
  stripePaymentIntentId: {
    type: String,
    required: false
  },
  stripeClientSecret: {
    type: String,
    required: false
  },
  stripeCustomerId: {
    type: String,
    required: false
  },
  // Legacy Confirmo fields (for backward compatibility)
  confirmoPaymentId: {
    type: String,
    required: false
  },
  confirmoOrderId: {
    type: String,
    required: false
  },
  paymentUrl: {
    type: String,
    required: false
  },
  transactionId: {
    type: String
  },
  paymentMethod: {
    type: String
  },
  failureReason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ userId: 1, challengeId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ confirmoPaymentId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
