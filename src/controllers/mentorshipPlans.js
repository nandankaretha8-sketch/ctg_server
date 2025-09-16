const MentorshipPlan = require('../models/MentorshipPlan');
const MentorshipChatbox = require('../models/MentorshipChatbox');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Get all active mentorship plans
const getAllMentorshipPlans = async (req, res) => {
  try {
    const plans = await MentorshipPlan.find({ isActive: true })
      .populate('createdBy', 'firstName lastName email')
      .sort({ price: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching mentorship plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorship plans',
      error: error.message
    });
  }
};

// Get specific mentorship plan
const getMentorshipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await MentorshipPlan.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('subscribers.user', 'firstName lastName email');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error fetching mentorship plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorship plan',
      error: error.message
    });
  }
};

// Create new mentorship plan (Admin only)
const createMentorshipPlan = async (req, res) => {
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
    
    const plan = new MentorshipPlan({
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
    
    // Create chatbox for the plan
    const chatbox = new MentorshipChatbox({
      mentorshipPlan: plan._id,
      settings: {
        allowStudentMessages: true,
        autoArchiveAfterDays: 30,
        maxMessageLength: 2000,
        sessionBookingEnabled: true
      }
    });
    
    await chatbox.save();
    
    res.status(201).json({
      success: true,
      message: 'Mentorship plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Error creating mentorship plan:', error);
    
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
      message: 'Failed to create mentorship plan',
      error: error.message
    });
  }
};

// Update mentorship plan (Admin only)
const updateMentorshipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.subscribers;
    delete updateData.currentSubscribers;
    
    const plan = await MentorshipPlan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship plan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Mentorship plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Error updating mentorship plan:', error);
    
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
      message: 'Failed to update mentorship plan',
      error: error.message
    });
  }
};

// Delete mentorship plan (Admin only)
const deleteMentorshipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await MentorshipPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship plan not found'
      });
    }
    
    // Check if there are active subscribers
    const activeSubscribers = plan.subscribers.filter(sub => sub.status === 'active');
    if (activeSubscribers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${activeSubscribers.length} active subscribers. Please cancel all subscriptions first.`
      });
    }
    
    // Delete associated chatbox
    await MentorshipChatbox.findOneAndDelete({ mentorshipPlan: id });
    
    // Delete the plan
    await MentorshipPlan.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Mentorship plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting mentorship plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mentorship plan',
      error: error.message
    });
  }
};

// Get user's mentorship subscriptions
const getUserMentorships = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscriptions = await Subscription.find({
      user: userId,
      mentorshipPlan: { $exists: true },
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('mentorshipPlan', 'name description price duration pricingType metadata')
      .populate('payment', 'amount status')
      .select('+sessionHistory +nextSessionDate'); // Include sessionHistory and nextSessionDate
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching user mentorships:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user mentorships',
      error: error.message
    });
  }
};

// Get all mentorship subscriptions (admin only)
const getAllMentorshipSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      mentorshipPlan: { $exists: true }
    })
    .populate('mentorshipPlan', 'name description price duration pricingType metadata')
    .populate('user', 'firstName lastName email')
    .populate('payment', 'amount status')
    .select('+sessionHistory +nextSessionDate') // Include sessionHistory and nextSessionDate
    .sort({ createdAt: -1 });
    
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching all mentorship subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorship subscriptions',
      error: error.message
    });
  }
};

// Subscribe to mentorship plan
const subscribeToMentorship = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    
    const plan = await MentorshipPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship plan not found'
      });
    }
    
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This mentorship plan is not available'
      });
    }
    
    // Check if plan is full
    if (plan.isFull) {
      return res.status(400).json({
        success: false,
        message: 'This mentorship plan is full'
      });
    }
    
    // Check if user is already subscribed
    const existingSubscription = await Subscription.findOne({
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
    
    // Calculate duration in days
    let durationInDays;
    switch (plan.duration) {
      case 'monthly':
        durationInDays = 30;
        break;
      case 'quarterly':
        durationInDays = 90;
        break;
      case 'semi-annual':
        durationInDays = 180;
        break;
      case 'annual':
        durationInDays = 365;
        break;
      default:
        durationInDays = 30;
    }
    
    // Create subscription (payment will be handled separately)
    const subscription = new Subscription({
      user: userId,
      mentorshipPlan: planId,
      status: 'pending',
      endDate: new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000),
      amount: plan.price,
      duration: plan.duration,
      metadata: {
        subscriptionType: 'mentorship'
      }
    });
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription created successfully. Please complete payment to activate.',
      data: {
        subscriptionId: subscription._id,
        planId: planId,
        amount: plan.price,
        duration: plan.duration
      }
    });
  } catch (error) {
    console.error('Error subscribing to mentorship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to mentorship',
      error: error.message
    });
  }
};

// Unsubscribe from mentorship plan
const unsubscribeFromMentorship = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }
    
    // Cancel subscription
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = 'User requested cancellation';
    subscription.autoRenew = false;
    
    await subscription.save();
    
    // Remove from mentorship plan subscribers
    const plan = await MentorshipPlan.findById(planId);
    if (plan) {
      await plan.removeSubscriber(userId);
    }
    
    // Remove from chatbox subscribers
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId });
    if (chatbox) {
      await chatbox.removeSubscriber(userId);
    }
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed from mentorship plan'
    });
  } catch (error) {
    console.error('Error unsubscribing from mentorship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from mentorship',
      error: error.message
    });
  }
};

// Schedule a mentorship session (admin only)
const scheduleMentorshipSession = async (req, res) => {
  try {
    const { planId } = req.params;
    const { subscriptionId, sessionDate, timezone, duration, topic, notes } = req.body;

    // Validate required fields
    if (!subscriptionId || !sessionDate || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subscriptionId, sessionDate, and duration are required'
      });
    }

    // Find the subscription
    const subscription = await Subscription.findById(subscriptionId)
      .populate('user', 'firstName lastName email pushSubscriptions')
      .populate('mentorshipPlan', 'name');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Verify the subscription belongs to the specified mentorship plan
    if (subscription.mentorshipPlan._id.toString() !== planId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription does not belong to the specified mentorship plan'
      });
    }

    // Verify the subscription is active
    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule session for inactive subscription'
      });
    }

    // Create session entry in sessionHistory
    const sessionEntry = {
      date: new Date(sessionDate),
      duration: duration,
      topic: topic || 'Mentorship Session',
      notes: notes || '',
      timezone: timezone || 'UTC',
      status: 'scheduled'
    };

    // Add session to subscription's sessionHistory
    subscription.sessionHistory.push(sessionEntry);
    
    // Update nextSessionDate if it's not set or if this session is earlier
    if (!subscription.nextSessionDate || new Date(sessionDate) < subscription.nextSessionDate) {
      subscription.nextSessionDate = new Date(sessionDate);
    }

    await subscription.save();

    // Send push notification to user about scheduled session
    try {
      console.log('🚀 [MENTORSHIP] Starting push notification process for user:', subscription.user.email);
      const { sendPushNotificationToMultiple } = require('../services/webPushService');
      
      console.log('🚀 [MENTORSHIP] User push subscriptions count:', subscription.user.pushSubscriptions?.length || 0);
      
      if (subscription.user.pushSubscriptions && subscription.user.pushSubscriptions.length > 0) {
        const sessionDateTime = new Date(sessionDate);
        const formattedDate = sessionDateTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const formattedTime = sessionDateTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });

        const notificationPayload = {
          title: '📅 New Mentorship Session Scheduled',
          body: `Your ${subscription.mentorshipPlan.name} session is scheduled for ${formattedDate} at ${formattedTime}. Topic: ${topic || 'Mentorship Session'}`,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'mentorship-session',
          requireInteraction: false,
          silent: false,
          data: {
            type: 'mentorship_session',
            sessionId: sessionEntry._id,
            subscriptionId: subscription._id,
            mentorshipPlanId: planId,
            sessionDate: sessionDateTime.toISOString(),
            topic: topic || 'Mentorship Session',
            url: '/mentorship-dashboard'
          }
        };

        console.log('🚀 [MENTORSHIP] Sending session scheduled notification to user:', subscription.user.email);
        const pushResult = await sendPushNotificationToMultiple(
          subscription.user.pushSubscriptions,
          notificationPayload,
          subscription.user._id
        );
        
        console.log('✅ [MENTORSHIP] Session scheduled notification sent:', pushResult);
      } else {
        console.log('⚠️ [MENTORSHIP] No push subscriptions found for user:', subscription.user.email);
      }
    } catch (notificationError) {
      console.error('❌ [MENTORSHIP] Error sending session scheduled notification:', notificationError);
      // Don't fail the session scheduling if notification fails
    }

    res.json({
      success: true,
      message: 'Session scheduled successfully',
      data: {
        session: sessionEntry,
        subscription: {
          id: subscription._id,
          user: subscription.user,
          mentorshipPlan: subscription.mentorshipPlan,
          nextSessionDate: subscription.nextSessionDate
        }
      }
    });

  } catch (error) {
    console.error('Error scheduling mentorship session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule session',
      error: error.message
    });
  }
};

// Update mentorship session
const updateMentorshipSession = async (req, res) => {
  try {
    const { planId, sessionId } = req.params;
    const { sessionDate, timezone, duration, topic, notes } = req.body;

    console.log('Updating mentorship session:', { planId, sessionId, sessionDate, timezone, duration, topic, notes });

    // Find the subscription
    const subscription = await Subscription.findById(planId)
      .populate('user', 'firstName lastName email pushSubscriptions');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Find the session in sessionHistory
    const sessionIndex = subscription.sessionHistory.findIndex(
      session => session._id.toString() === sessionId
    );

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Update the session
    subscription.sessionHistory[sessionIndex] = {
      ...subscription.sessionHistory[sessionIndex],
      date: new Date(sessionDate),
      timezone: timezone || 'UTC',
      duration: duration,
      topic: topic || 'Mentorship Session',
      notes: notes || '',
      status: 'scheduled'
    };

    // Update nextSessionDate if this was the next session
    const scheduledSessions = subscription.sessionHistory.filter(session => session.status === 'scheduled');
    if (scheduledSessions.length > 0) {
      const nextSession = scheduledSessions.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      subscription.nextSessionDate = new Date(nextSession.date);
    } else {
      subscription.nextSessionDate = null;
    }

    await subscription.save();

    console.log('Session updated successfully');

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: subscription.sessionHistory[sessionIndex]
      }
    });

  } catch (error) {
    console.error('Error updating mentorship session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session'
    });
  }
};

// Delete mentorship session
const deleteMentorshipSession = async (req, res) => {
  try {
    const { planId, sessionId } = req.params;

    console.log('Deleting mentorship session:', { planId, sessionId });

    // Find the subscription
    const subscription = await Subscription.findById(planId)
      .populate('user', 'firstName lastName email pushSubscriptions');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Find and remove the session from sessionHistory
    const sessionIndex = subscription.sessionHistory.findIndex(
      session => session._id.toString() === sessionId
    );

    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Remove the session
    subscription.sessionHistory.splice(sessionIndex, 1);

    // Update nextSessionDate
    const scheduledSessions = subscription.sessionHistory.filter(session => session.status === 'scheduled');
    if (scheduledSessions.length > 0) {
      const nextSession = scheduledSessions.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      subscription.nextSessionDate = new Date(nextSession.date);
    } else {
      subscription.nextSessionDate = null;
    }

    await subscription.save();

    console.log('Session deleted successfully');

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting mentorship session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
};

module.exports = {
  getAllMentorshipPlans,
  getMentorshipPlan,
  createMentorshipPlan,
  updateMentorshipPlan,
  deleteMentorshipPlan,
  getUserMentorships,
  getAllMentorshipSubscriptions,
  subscribeToMentorship,
  unsubscribeFromMentorship,
  scheduleMentorshipSession,
  updateMentorshipSession,
  deleteMentorshipSession
};
