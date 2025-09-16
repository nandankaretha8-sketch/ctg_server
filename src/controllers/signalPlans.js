const SignalPlan = require('../models/SignalPlan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const crypto = require('crypto');

// Get all active signal plans
const getSignalPlans = async (req, res) => {
  try {
    const plans = await SignalPlan.getActivePlans();
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching signal plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signal plans',
      error: error.message
    });
  }
};

// Get single signal plan by ID
const getSignalPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await SignalPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error fetching signal plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signal plan',
      error: error.message
    });
  }
};

// Create new signal plan (Admin only)
const createSignalPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      features,
      isPopular,
      maxSubscribers,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!name || !description || price === undefined || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, price, duration'
      });
    }
    
    // Validate features array
    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Features array is required and cannot be empty'
      });
    }
    
    const plan = new SignalPlan({
      name,
      description,
      price,
      duration,
      features,
      isPopular: isPopular || false,
      maxSubscribers: maxSubscribers || null,
      createdBy: req.user.id,
      metadata: metadata || {}
    });
    
    await plan.save();
    
    res.status(201).json({
      success: true,
      message: 'Signal plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Error creating signal plan:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
        validationErrors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create signal plan',
      error: error.message
    });
  }
};

// Update signal plan (Admin only)
const updateSignalPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.subscribers;
    delete updateData.currentSubscribers;
    
    const plan = await SignalPlan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Signal plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Error updating signal plan:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
        validationErrors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update signal plan',
      error: error.message
    });
  }
};

// Delete signal plan (Admin only)
const deleteSignalPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await SignalPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }
    
    // Check if plan has active subscribers
    const activeSubscribers = plan.subscribers.filter(sub => sub.status === 'active');
    if (activeSubscribers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscribers. Please deactivate instead.'
      });
    }
    
    await SignalPlan.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Signal plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting signal plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete signal plan',
      error: error.message
    });
  }
};

// Create payment for signal plan subscription
const createSignalPlanPayment = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.firstName + ' ' + req.user.lastName;
    
    // Validate required fields
    if (!planId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: planId, userId'
      });
    }
    
    // Check if signal plan exists and is active
    const plan = await SignalPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }
    
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This signal plan is no longer available'
      });
    }
    
    // Check if plan is full
    if (plan.isFull) {
      return res.status(400).json({
        success: false,
        message: 'This signal plan is currently full'
      });
    }
    
    // Check if user already has an active subscription using the new Subscription model
    const existingSubscription = await Subscription.findOne({
      user: userId,
      signalPlan: planId,
      status: 'active'
    });
    
    if (existingSubscription && existingSubscription.endDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription to this plan'
      });
    }

    // Create Stripe Payment Intent
    const StripeService = require('../services/stripeService');
    const stripeResult = await StripeService.createPaymentIntent({
      amount: plan.price,
      currency: 'USD',
      customerEmail: userEmail,
      customerName: userName,
      metadata: {
        userId,
        planId,
        type: 'signal_plan',
        entityName: plan.name
      }
    });

    if (!stripeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment intent'
      });
    }

    const { paymentIntent, customerId } = stripeResult;

    // Create payment record
    const payment = new Payment({
      userId,
      planId,
      amount: plan.price,
      currency: 'USD',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      stripeCustomerId: customerId,
      status: 'pending',
      metadata: {
        userEmail,
        userName,
        entityName: plan.name,
        type: 'signal_plan',
        duration: plan.duration
      }
    });

    await payment.save();

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        amount: plan.price,
        currency: 'USD',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });
  } catch (error) {
    console.error('Error creating signal plan payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

// Get user's signal plan subscriptions
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const Subscription = require('../models/Subscription');
    const subscriptions = await Subscription.find({
      user: userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).select('_id signalPlan status endDate');
    
    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

// Cancel user's signal plan subscription
const cancelSubscription = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    
    const plan = await SignalPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }
    
    await plan.removeSubscriber(userId);
    
    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};


module.exports = {
  getSignalPlans,
  getSignalPlan,
  createSignalPlan,
  updateSignalPlan,
  deleteSignalPlan,
  createSignalPlanPayment,
  getUserSubscriptions,
  cancelSubscription
};
