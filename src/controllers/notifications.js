const Notification = require('../models/Notification');
const User = require('../models/User');
const SignalPlan = require('../models/SignalPlan');
const Subscription = require('../models/Subscription');
const Challenge = require('../models/Challenge');
const { sendPushNotificationToMultiple } = require('../services/webPushService');

// Get all notifications (admin only)
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Get target users based on audience
const getTargetUsers = async (targetAudience, signalPlanId = null, competitionId = null) => {
  let targetUsers = [];
  
  if (targetAudience === 'all') {
    targetUsers = await User.find();
  } else if (targetAudience === 'active') {
    targetUsers = await User.find({ isActive: true });
  } else if (targetAudience === 'premium') {
    targetUsers = await User.find({ isPremium: true });
  } else if (targetAudience === 'challenge_participants') {
    // Get users who are participants in active challenges
    try {
      const activeChallenges = await Challenge.find({
        status: { $in: ['active', 'upcoming'] }
      }).populate('participants.user');
      
      const userIds = new Set();
      activeChallenges.forEach(challenge => {
        challenge.participants.forEach(participant => {
          if (participant.user && participant.status !== 'withdrawn') {
            userIds.add(participant.user._id.toString());
          }
        });
      });
      
      if (userIds.size > 0) {
        targetUsers = await User.find({ _id: { $in: Array.from(userIds) } });
      } else {
        targetUsers = [];
      }
    } catch (dbError) {
      console.error('Database error querying challenges:', dbError.message);
      targetUsers = [];
    }
  } else if (targetAudience === 'signal_plan_subscribers') {
    // Get all users who have active signal plan subscriptions
    const signalPlans = await SignalPlan.find({
      'subscribers.status': 'active',
      'subscribers.expiresAt': { $gt: new Date() }
    }).populate('subscribers.user');
    
    const userIds = new Set();
    signalPlans.forEach(plan => {
      plan.subscribers.forEach(sub => {
        if (sub.status === 'active' && sub.expiresAt > new Date()) {
          userIds.add(sub.user._id.toString());
        }
      });
    });
    
    targetUsers = await User.find({ _id: { $in: Array.from(userIds) } });
  } else if (targetAudience === 'specific_signal_plan' && signalPlanId) {
    // Get users subscribed to a specific signal plan using Subscription model
    try {
      const signalPlan = await SignalPlan.findById(signalPlanId);
      
      if (signalPlan) {
        // Get active subscriptions for this signal plan
        try {
          const activeSubscriptions = await Subscription.find({
            signalPlan: signalPlanId,
            status: 'active',
            endDate: { $gt: new Date() }
          }).populate('user');
          
          targetUsers = activeSubscriptions.map(sub => sub.user).filter(user => user);
        } catch (dbError) {
          console.error('Database error querying subscriptions:', dbError.message);
          targetUsers = [];
        }
      }
    } catch (error) {
      console.error('Error querying signal plan:', error.message);
    }
  } else if (targetAudience === 'specific_competition' && competitionId) {
    // Get users who are participants in a specific competition
    try {
      const competition = await Challenge.findById(competitionId);
      
      if (competition) {
        // Get participants from this specific competition
        try {
          const participantIds = competition.participants
            .filter(participant => participant.status !== 'withdrawn')
            .map(participant => participant.user);
          
          if (participantIds.length > 0) {
            targetUsers = await User.find({ _id: { $in: participantIds } });
          } else {
            targetUsers = [];
          }
        } catch (dbError) {
          console.error('Database error querying competition participants:', dbError.message);
          targetUsers = [];
        }
      }
    } catch (error) {
      console.error('Error querying competition:', error.message);
    }
  }
  
  return targetUsers;
};

// Create and send notification
const sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      targetAudience,
      signalPlanId,
      competitionId,
      isScheduled,
      scheduledTime,
      metadata = {}
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!title || !message || !type || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, type, and target audience are required'
      });
    }

    // Validate signalPlanId for specific signal plan targeting
    if (targetAudience === 'specific_signal_plan' && !signalPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Signal plan ID is required when targeting specific signal plan'
      });
    }

    // Validate competitionId for specific competition targeting
    if (targetAudience === 'specific_competition' && !competitionId) {
      return res.status(400).json({
        success: false,
        message: 'Competition ID is required when targeting specific competition'
      });
    }

    // Create notification record
    const notification = new Notification({
      title,
      message,
      type,
      targetAudience,
      signalPlanId: targetAudience === 'specific_signal_plan' ? signalPlanId : undefined,
      competitionId: targetAudience === 'specific_competition' ? competitionId : undefined,
      isScheduled: isScheduled || false,
      scheduledTime: isScheduled ? new Date(scheduledTime) : undefined,
      sentBy: userId,
      status: isScheduled ? 'scheduled' : 'draft',
      metadata
    });

    await notification.save();

    // If not scheduled, send immediately
    if (!isScheduled) {
      try {
        // Get target users
        let targetUsers = [];
        try {
          targetUsers = await getTargetUsers(targetAudience, signalPlanId, competitionId);
        } catch (getUsersError) {
          console.error('Error getting target users:', getUsersError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to get target users',
            error: getUsersError.message
          });
        }
        
        if (targetUsers.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No users found for the specified target audience'
          });
        }

        // Collect all push subscriptions from target users
        const pushSubscriptions = [];
        targetUsers.forEach(user => {
          if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
            pushSubscriptions.push(...user.pushSubscriptions);
          }
        });

        let results = { totalSent: 0, deliveredCount: 0, failedCount: 0 };

        if (pushSubscriptions.length > 0) {
          // Prepare notification payload
          const payload = {
            title,
            body: message,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: 'ctg-notification',
            requireInteraction: true,
            data: {
              type,
              notificationId: notification._id.toString(),
              timestamp: new Date().toISOString(),
              url: '/'
            }
          };

          // Send push notifications
          results = await sendPushNotificationToMultiple(pushSubscriptions, payload);
        }

        // Update notification with results
        await notification.updateDeliveryStats({
          totalSent: results.totalSent,
          deliveredCount: results.deliveredCount,
          failedCount: results.failedCount
        });

        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();

        res.json({
          success: true,
          message: 'Notification sent successfully',
          data: {
            notification,
            results: {
              totalSent: results.totalSent,
              deliveredCount: results.deliveredCount,
              failedCount: results.failedCount
            }
          }
        });
      } catch (sendError) {
        console.error('Error sending notification:', sendError);
        
        notification.status = 'failed';
        notification.errors.push({
          timestamp: new Date(),
          error: sendError.message || 'Unknown error occurred',
          details: { stack: sendError.stack }
        });
        await notification.save();

        res.status(500).json({
          success: false,
          message: 'Failed to send notification',
          error: sendError.message
        });
      }
    } else {
      // Scheduled notification
      res.json({
        success: true,
        message: 'Notification scheduled successfully',
        data: { notification }
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const sentNotifications = await Notification.countDocuments({ status: 'sent' });
    const scheduledNotifications = await Notification.countDocuments({ status: 'scheduled' });
    const failedNotifications = await Notification.countDocuments({ status: 'failed' });

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        sent: sentNotifications,
        scheduled: scheduledNotifications,
        failed: failedNotifications
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllNotifications,
  sendNotification,
  deleteNotification,
  getNotificationStats
};