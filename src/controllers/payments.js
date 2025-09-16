const Payment = require('../models/Payment');
const Challenge = require('../models/Challenge');
const SignalPlan = require('../models/SignalPlan');
const MentorshipPlan = require('../models/MentorshipPlan');
const User = require('../models/User');
const crypto = require('crypto');
const StripeService = require('../services/stripeService');

// Helper function to update user's trading stats
const updateUserTradingStats = async (userId) => {
  try {
    // Get user's challenges
    const challenges = await Challenge.find({
      'participants.user': userId,
    });

    const userParticipations = challenges.map(challenge => {
      const participation = challenge.participants.find(
        p => p.user.toString() === userId.toString()
      );
      return {
        status: participation.status,
        profit: participation.profit || 0,
      };
    });

    // Calculate stats
    const totalChallenges = userParticipations.length;
    const completedChallenges = userParticipations.filter(p => p.status === 'completed').length;
    const totalProfit = userParticipations.reduce((sum, p) => sum + p.profit, 0);
    const winRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;

    // Update user's trading stats
    await User.findByIdAndUpdate(userId, {
      'tradingStats.totalChallenges': totalChallenges,
      'tradingStats.completedChallenges': completedChallenges,
      'tradingStats.totalProfit': totalProfit,
      'tradingStats.winRate': Math.round(winRate * 100) / 100, // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error updating user trading stats:', error);
  }
};

// Stripe configuration
const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY
};

// Create payment
const createPayment = async (req, res) => {
  try {
    const { amount, currency, challengeId, userId, userEmail, userName, type, planId, packageId } = req.body;

    // Validate required fields
    if (!amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Validate payment type
    if (!type || !['challenge', 'signal_plan', 'mentorship', 'prop_firm_service'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type'
      });
    }

    // Check if Stripe is configured
    if (!STRIPE_CONFIG.secretKey || STRIPE_CONFIG.secretKey === 'your_stripe_secret_key') {
      return res.status(400).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.'
      });
    }

    let entity = null;
    let entityName = '';

    // Validate based on payment type
    if (type === 'challenge') {
      if (!challengeId) {
        return res.status(400).json({
          success: false,
          message: 'Challenge ID is required for challenge payments'
        });
      }

      entity = await Challenge.findById(challengeId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Check if user is already a participant
      const existingParticipant = entity.participants.find(
        p => p.user.toString() === userId.toString()
      );
      
      if (existingParticipant) {
        return res.status(400).json({
          success: false,
          message: 'You are already a participant in this challenge'
        });
      }

      // Check if challenge is full
      if (entity.currentParticipants >= entity.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Challenge is full'
        });
      }

      // Check if challenge is still available for joining
      if (entity.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'This challenge has already ended'
        });
      }
      
      if (entity.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'This challenge has been cancelled'
        });
      }

      entityName = entity.name;
    } else if (type === 'signal_plan') {
      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required for signal plan payments'
        });
      }

      entity = await SignalPlan.findById(planId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Signal plan not found'
        });
      }

      entityName = entity.name;
    } else if (type === 'mentorship') {
      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required for mentorship payments'
        });
      }

      entity = await MentorshipPlan.findById(planId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Mentorship plan not found'
        });
      }

      // Check if user is already subscribed
      const existingSubscription = await require('../models/Subscription').findOne({
        user: userId,
        mentorshipPlan: planId,
        status: 'active',
        endDate: { $gt: new Date() }
      });
      
      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'You are already subscribed to this mentorship plan'
        });
      }

      // Check if plan is full
      if (entity.isFull) {
        return res.status(400).json({
          success: false,
          message: 'This mentorship plan is full'
        });
      }

      entityName = entity.name;
    } else if (type === 'prop_firm_service') {
      if (!packageId) {
        return res.status(400).json({
          success: false,
          message: 'Package ID is required for prop firm service payments'
        });
      }

      const PropFirmPackage = require('../models/PropFirmPackage');
      entity = await PropFirmPackage.findById(packageId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Prop firm package not found'
        });
      }

      // Check if package is still available
      if (!entity.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This package is no longer available'
        });
      }

      // Check if package is full
      if (entity.isFull) {
        return res.status(400).json({
          success: false,
          message: 'This package is currently full'
        });
      }

      entityName = entity.name;
    }

    // Create Stripe Payment Intent
    const stripeResult = await StripeService.createPaymentIntent({
      amount,
      currency: currency || 'USD',
      customerEmail: userEmail,
      customerName: userName,
      metadata: {
        userId,
        challengeId: challengeId || null,
        planId: planId || null,
        packageId: packageId || null,
        type,
        entityName
      }
    });

    if (!stripeResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: stripeResult.error
      });
    }

    const { paymentIntent, customerId } = stripeResult;

    // Create payment record in database
    const payment = new Payment({
      userId,
      challengeId: challengeId || null,
      planId: planId || null,
      packageId: packageId || null,
      amount,
      currency: currency || 'USD',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      stripeCustomerId: customerId,
      status: 'pending',
      metadata: {
        userEmail,
        userName,
        entityName,
        type
      }
    });

    await payment.save();

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency || 'USD',
        publishableKey: STRIPE_CONFIG.publishableKey
      }
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

// Confirm payment (called from frontend after successful payment)
const confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Find payment by ID
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is already completed
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already completed',
        data: payment
      });
    }

    // Verify payment status with Stripe
    const stripeResult = await StripeService.getPaymentIntent(payment.stripePaymentIntentId);
    if (!stripeResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment with Stripe',
        error: stripeResult.error
      });
    }

    const { paymentIntent } = stripeResult;

    // Update payment status based on Stripe status
    if (paymentIntent.status === 'succeeded') {
      payment.status = 'completed';
      payment.transactionId = paymentIntent.id;
      payment.paymentMethod = paymentIntent.payment_method?.type || 'card';
      
      await payment.save();

      // Process payment completion based on type
      await processPaymentCompletion(payment);

      // For signal plan payments, fetch the subscription details
      let subscriptionData = null;
      if (payment.metadata.type === 'signal_plan' && payment.planId) {
        const Subscription = require('../models/Subscription');
        const SignalPlan = require('../models/SignalPlan');
        
        subscriptionData = await Subscription.findOne({
          user: payment.userId,
          signalPlan: payment.planId,
          payment: payment._id
        }).populate('signalPlan', 'name description duration price');
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          payment,
          subscription: subscriptionData
        }
      });
    } else if (paymentIntent.status === 'requires_payment_method' || 
               paymentIntent.status === 'canceled') {
      payment.status = 'failed';
      payment.failureReason = 'Payment was canceled or failed';
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        data: payment
      });
    } else {
      // Payment is still processing
      res.json({
        success: true,
        message: 'Payment is still processing',
        data: payment
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
};

// Process payment completion (common logic for all payment types)
const processPaymentCompletion = async (payment) => {
  try {
    const { type } = payment.metadata;

    if (type === 'signal_plan' && payment.planId) {
      const signalPlan = await SignalPlan.findById(payment.planId);
      if (signalPlan) {
        // Create subscription using the Subscription model
        const Subscription = require('../models/Subscription');
        
        // Calculate end date based on plan duration
        const startDate = new Date();
        let endDate;
        
        switch (signalPlan.duration) {
          case 'monthly':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
            break;
          case 'quarterly':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 3));
            break;
          case 'semi-annual':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 6));
            break;
          case 'annual':
            endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
            break;
          default:
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
        }

        // Create subscription
        const subscription = new Subscription({
          user: payment.userId,
          signalPlan: payment.planId,
          payment: payment._id,
          amount: payment.amount,
          duration: signalPlan.duration,
          endDate: endDate,
          status: 'active',
          metadata: {
            stripePaymentIntentId: payment.stripePaymentIntentId,
            stripeCustomerId: payment.stripeCustomerId,
            paymentMethod: payment.paymentMethod || 'card',
            currency: payment.currency || 'USD'
          }
        });

        await subscription.save();

        // Update user's signal plan subscriptions
        const User = require('../models/User');
        await User.findByIdAndUpdate(payment.userId, {
          $addToSet: { signalPlanSubscriptions: subscription._id }
        });

        // Update signal plan subscriber count
        await SignalPlan.findByIdAndUpdate(payment.planId, {
          $inc: { currentSubscribers: 1 }
        });
      }
    } else if (type === 'challenge' && payment.challengeId) {
      const challenge = await Challenge.findById(payment.challengeId);
      if (challenge) {
        // Add user as participant (without MT5 account for now)
        challenge.participants.push({
          user: payment.userId,
          joinedAt: new Date(),
          status: 'pending_setup', // User needs to complete MT5 setup
          paymentId: payment._id
        });
        
        challenge.currentParticipants += 1;
        await challenge.save();
        
        // Update user's trading stats when they join a challenge
        await updateUserTradingStats(payment.userId);
      }
    } else if (type === 'mentorship' && payment.planId) {
      const mentorshipPlan = await MentorshipPlan.findById(payment.planId);
      if (mentorshipPlan) {
        // Create subscription using the Subscription model
        const Subscription = require('../models/Subscription');
        
        // Calculate end date based on plan duration
        const startDate = new Date();
        let endDate;
        
        switch (mentorshipPlan.duration) {
          case 'monthly':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
            break;
          case 'quarterly':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 3));
            break;
          case 'semi-annual':
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 6));
            break;
          case 'annual':
            endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
            break;
          default:
            endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
        }

        // Create subscription
        const subscription = new Subscription({
          user: payment.userId,
          mentorshipPlan: payment.planId,
          payment: payment._id,
          amount: payment.amount,
          duration: mentorshipPlan.duration,
          endDate: endDate,
          status: 'active',
          maxSessions: mentorshipPlan.metadata.maxSessionsPerMonth || 4,
          metadata: {
            subscriptionType: 'mentorship',
            stripePaymentIntentId: payment.stripePaymentIntentId,
            stripeCustomerId: payment.stripeCustomerId,
            paymentMethod: payment.paymentMethod || 'card',
            currency: payment.currency || 'USD'
          }
        });

        await subscription.save();

        // Add subscriber to mentorship plan
        await mentorshipPlan.addSubscriber(payment.userId, payment._id, 
          mentorshipPlan.duration === 'monthly' ? 30 : 
          mentorshipPlan.duration === 'quarterly' ? 90 :
          mentorshipPlan.duration === 'semi-annual' ? 180 : 365
        );

        // Add subscriber to chatbox
        const MentorshipChatbox = require('../models/MentorshipChatbox');
        const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: payment.planId });
        if (chatbox) {
          await chatbox.addSubscriber(payment.userId, subscription._id);
        }

        // Update user's mentorship subscriptions
        await User.findByIdAndUpdate(payment.userId, {
          $addToSet: { mentorshipSubscriptions: subscription._id }
        });
      }
    }
    // Handle prop firm service payment completion
    if (payment.metadata.type === 'prop_firm_service') {
      const PropFirmService = require('../models/PropFirmService');
      
      // Find the prop firm service by application ID
      const service = await PropFirmService.findOne({
        payment: payment._id
      });
      
      if (service) {
        // Update service status to pending for admin review
        service.status = 'pending';
        service.metadata.verificationStatus = 'pending';
        await service.save();
        
        console.log(`Prop firm service ${service._id} set to pending after payment completion`);
      }
    }

  } catch (error) {
    console.error('Error processing payment completion:', error);
  }
};

// Handle payment webhook (kept for backward compatibility, but not used with new Stripe flow)
const handleWebhook = async (req, res) => {
  try {
    // This endpoint is kept for backward compatibility
    // New Stripe flow doesn't use webhooks
    res.json({ 
      success: true, 
      message: 'Webhook endpoint active but not used with new Stripe flow' 
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('challengeId', 'name')
      .populate('userId', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

// Get user payments
const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.find({ userId })
      .populate('challengeId', 'name type accountSize')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error getting user payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user payments',
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  confirmPayment,
  handleWebhook,
  getPaymentStatus,
  getUserPayments
};
