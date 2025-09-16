const Subscription = require('../models/Subscription');
const SignalPlan = require('../models/SignalPlan');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    const { signalPlanId, paymentId, amount, duration, confirmoData } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!signalPlanId || !paymentId || !amount || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: signalPlanId, paymentId, amount, duration'
      });
    }

    // Check if signal plan exists
    const signalPlan = await SignalPlan.findById(signalPlanId);
    if (!signalPlan) {
      return res.status(404).json({
        success: false,
        message: 'Signal plan not found'
      });
    }

    // Check if user already has an active subscription to this plan
    const existingSubscription = await Subscription.findOne({
      user: userId,
      signalPlan: signalPlanId,
      status: 'active'
    });

    if (existingSubscription && existingSubscription.endDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription to this signal plan'
      });
    }

    // Calculate end date based on duration
    const startDate = new Date();
    let endDate;
    
    switch (duration) {
      case 'monthly':
        endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
        break;
      case 'quarterly':
        endDate = new Date(startDate.setMonth(startDate.getMonth() + 3));
        break;
      case 'semi_annual':
        endDate = new Date(startDate.setMonth(startDate.getMonth() + 6));
        break;
      case 'annual':
        endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid duration'
        });
    }

    // Create subscription
    const subscription = new Subscription({
      user: userId,
      signalPlan: signalPlanId,
      payment: paymentId,
      amount,
      duration,
      endDate,
      status: 'active',
      metadata: {
        confirmoTransactionId: confirmoData?.transactionId,
        confirmoPaymentId: confirmoData?.paymentId,
        paymentMethod: confirmoData?.paymentMethod,
        currency: confirmoData?.currency || 'USD'
      }
    });

    await subscription.save();

    // Update user's signal plan subscriptions
    await User.findByIdAndUpdate(userId, {
      $addToSet: { signalPlanSubscriptions: subscription._id }
    });

    // Update signal plan subscriber count
    await SignalPlan.findByIdAndUpdate(signalPlanId, {
      $inc: { currentSubscribers: 1 }
    });

    // Populate the subscription with related data
    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate('user', 'firstName lastName email')
      .populate('signalPlan', 'name price duration')
      .populate('payment', 'amount status');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: populatedSubscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
};

// Get user's subscriptions
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all' } = req.query;

    const filter = { user: userId };
    if (status !== 'all') filter.status = status;

    const subscriptions = await Subscription.find(filter)
      .populate('signalPlan', 'name price duration features metadata')
      .populate('payment', 'amount status createdAt')
      .sort({ createdAt: -1 });

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

// Get signal plan subscribers (admin only)
const getSignalPlanSubscribers = async (req, res) => {
  try {
    const { signalPlanId } = req.params;
    const { status = 'active', page = 1, limit = 20 } = req.query;

    const filter = { signalPlan: signalPlanId };
    if (status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const subscriptions = await Subscription.find(filter)
      .populate('user', 'firstName lastName email createdAt')
      .populate('payment', 'amount status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching signal plan subscribers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscribers',
      error: error.message
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    // Cancel the subscription
    await subscription.cancel(reason);

    // Update signal plan subscriber count
    await SignalPlan.findByIdAndUpdate(subscription.signalPlan, {
      $inc: { currentSubscribers: -1 }
    });

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

// Get subscription statistics (admin only)
const getSubscriptionStats = async (req, res) => {
  try {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    const durationStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$duration',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    const signalPlanStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$signalPlan',
          subscriberCount: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'signalplans',
          localField: '_id',
          foreignField: '_id',
          as: 'signalPlan'
        }
      },
      {
        $unwind: '$signalPlan'
      },
      {
        $project: {
          signalPlanName: '$signalPlan.name',
          subscriberCount: 1,
          revenue: 1
        }
      }
    ]);

    const responseStats = stats[0] || {
      total: 0,
      active: 0,
      cancelled: 0,
      expired: 0,
      pending: 0,
      totalRevenue: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...responseStats,
        durationBreakdown: durationStats,
        signalPlanBreakdown: signalPlanStats
      }
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
      error: error.message
    });
  }
};

module.exports = {
  createSubscription,
  getUserSubscriptions,
  getSignalPlanSubscribers,
  cancelSubscription,
  getSubscriptionStats
};
