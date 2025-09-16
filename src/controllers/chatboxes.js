const Chatbox = require('../models/Chatbox');
const SignalPlan = require('../models/SignalPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const webPushService = require('../services/webPushService');


// Get messages for a specific chatbox (signal plan)
const getChatboxMessages = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;

    // Check if user has active subscription to this signal plan
    const subscription = await Subscription.findOne({
      user: userId,
      signalPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (!subscription) {
      return res.status(403).json({ success: false, message: 'You are not subscribed to this signal plan' });
    }

    let chatbox = await Chatbox.findOne({ signalPlan: planId })
      .populate({
        path: 'messages.sender',
        select: 'firstName lastName username role'
      })
      .populate({
        path: 'subscribers.user',
        select: 'firstName lastName username role'
      });

    if (!chatbox) {
      // Create chatbox if it doesn't exist
      chatbox = new Chatbox({ 
        signalPlan: planId, 
        createdBy: userId,
        subscribers: [{ 
          user: userId, 
          subscription: subscription._id,
          joinedAt: new Date(),
          isActive: true
        }],
        viewCount: 1
      });
      await chatbox.save();
    } else {
      // Increment view count for each access
      await chatbox.incrementViewCount();
    }

    res.status(200).json({ success: true, data: chatbox.messages || [] });
  } catch (error) {
    console.error('Error fetching chatbox messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chatbox messages', error: error.message });
  }
};

// Send message to chatbox
const sendMessage = async (req, res) => {
  try {
    const { planId } = req.params;
    const { content, isSignal = false, isScheduled = false, scheduledTime } = req.body;
    const userId = req.user.id;

    // Check if signal plan exists
    const signalPlan = await SignalPlan.findById(planId);
    if (!signalPlan) {
      return res.status(404).json({ success: false, message: 'Signal plan not found' });
    }

    // Check if user is admin for sending signals, or if user has active subscription for regular messages
    if (isSignal && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can send signals' });
    }

    if (!isSignal) {
      const subscription = await Subscription.findOne({
        user: userId,
        signalPlan: planId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (!subscription) {
        return res.status(403).json({ success: false, message: 'You are not subscribed to this signal plan' });
      }
    }

    // Get or create chatbox
    let chatbox = await Chatbox.findOne({ signalPlan: planId })
      .populate({
        path: 'subscribers.user',
        select: 'firstName lastName username pushSubscriptions'
      });

    if (!chatbox) {
      // Create new chatbox
      chatbox = new Chatbox({ 
        signalPlan: planId,
        createdBy: userId,
        subscribers: [{ user: userId, subscription: null }] // We'll update this later if needed
      });
      await chatbox.save();
    } else {
      // Add user to subscribers if not already there
      const existingSubscriber = chatbox.subscribers.find(s => s.user.toString() === userId.toString());
      if (!existingSubscriber) {
        chatbox.subscribers.push({ user: userId, subscription: null });
        await chatbox.save();
      }
    }

    // Create message
    const message = {
      sender: userId,
      content: content,
      timestamp: new Date(),
      isSignal: isSignal
    };

    // Add message to chatbox
    chatbox.messages.push(message);
    await chatbox.save();

    // Populate the message with sender info
    await chatbox.populate({
      path: 'messages.sender',
      select: 'firstName lastName username role'
    });

    const newMessage = chatbox.messages[chatbox.messages.length - 1];

    // Send push notifications to all subscribers (except sender)
    let pushSubscriptions = [];
    
    if (isSignal) {
      // For signals, notify ALL signal plan subscribers, not just chatbox subscribers
      console.log('🚨 [CHATBOX] Sending signal notification to all signal plan subscribers');
      
      // Get all active subscriptions for this signal plan using Subscription model
      const activeSubscriptions = await Subscription.find({
        signalPlan: planId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('user');
      
      console.log(`🚨 [CHATBOX] Found ${activeSubscriptions.length} active signal plan subscriptions`);
      
      for (const subscription of activeSubscriptions) {
        if (subscription.user && subscription.user.pushSubscriptions && 
            subscription.user.pushSubscriptions.length > 0) {
          pushSubscriptions.push(...subscription.user.pushSubscriptions);
        }
      }
    } else {
      // For regular messages, notify all chatbox subscribers (including sender)
      if (chatbox.subscribers.length > 0) {
        for (const subscriber of chatbox.subscribers) {
          if (subscriber.user.pushSubscriptions && subscriber.user.pushSubscriptions.length > 0) {
            pushSubscriptions.push(...subscriber.user.pushSubscriptions);
          }
        }
      }
    }

      if (pushSubscriptions.length > 0) {
        const notificationPayload = {
          title: isSignal ? '🚨 New Trading Signal' : '💬 New Message',
          body: content.length > 100 ? content.substring(0, 100) + '...' : content,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'chatbox-message',
          requireInteraction: true,
          data: {
            type: 'chatbox_message',
            planId: planId,
            messageId: newMessage._id.toString(),
            isSignal: isSignal,
            timestamp: new Date().toISOString(),
            url: `/chatbox/plan/${planId}`
          }
        };

        // Send push notifications asynchronously to avoid blocking message sending
        setImmediate(async () => {
          try {
            const results = await webPushService.sendPushNotificationToMultiple(pushSubscriptions, notificationPayload, userId);
            console.log(`📱 Push notifications sent to ${results.deliveredCount}/${results.totalSent} ${isSignal ? 'signal plan subscribers (including sender)' : 'chatbox subscribers (including sender)'} for ${isSignal ? 'signal' : 'message'}`);
          } catch (pushError) {
            console.error('Failed to send push notifications:', pushError);
          }
        });
      }

    res.status(200).json({ 
      success: true, 
      data: newMessage 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message', 
      error: error.message 
    });
  }
};


// Get chatbox participants
const getChatboxParticipants = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;

    // Check if user is admin or has access to this signal plan
    if (req.user.role !== 'admin') {
      const subscription = await Subscription.findOne({
        user: userId,
        signalPlan: planId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (!subscription) {
        return res.status(403).json({ success: false, message: 'You are not subscribed to this signal plan' });
      }
    }

    const chatbox = await Chatbox.findOne({ plan: planId })
      .populate({
        path: 'subscribers.user',
        select: 'firstName lastName username email role'
      });

    if (!chatbox) {
      return res.status(404).json({ success: false, message: 'Chatbox not found' });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        participants: chatbox.subscribers,
        totalParticipants: chatbox.subscribers.length
      }
    });
  } catch (error) {
    console.error('Error fetching chatbox participants:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch participants', 
      error: error.message 
    });
  }
};

// Get chatbox information for a specific signal plan
const getChatbox = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;

    // Check if user has active subscription to this signal plan
    const subscription = await Subscription.findOne({
      user: userId,
      signalPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (!subscription) {
      return res.status(403).json({ success: false, message: 'You are not subscribed to this signal plan' });
    }

    // Get signal plan details
    const signalPlan = await SignalPlan.findById(planId);
    if (!signalPlan) {
      return res.status(404).json({ success: false, message: 'Signal plan not found' });
    }

    // Get or create chatbox
    let chatbox = await Chatbox.findOne({ signalPlan: planId })
      .populate({
        path: 'subscribers.user',
        select: 'firstName lastName username'
      });

    if (!chatbox) {
      // Create new chatbox if it doesn't exist
      chatbox = new Chatbox({
        signalPlan: planId,
        createdBy: userId,
        subscribers: [{ 
          user: userId, 
          subscription: subscription._id,
          joinedAt: new Date(),
          isActive: true
        }],
        viewCount: 1
      });
      await chatbox.save();
    } else {
      // Increment view count for each access
      await chatbox.incrementViewCount();
    }

    // Format response
    const response = {
      _id: chatbox._id,
      name: `${signalPlan.name} Signal Chatbox`,
      description: `Exclusive chatbox for ${signalPlan.name} subscribers. Get real-time trading signals and expert analysis.`,
      signalPlan: {
        _id: signalPlan._id,
        name: signalPlan.name,
        description: signalPlan.description,
        price: signalPlan.price,
        duration: signalPlan.duration
      },
      subscribers: chatbox.subscribers.map(sub => ({
        user: sub.user,
        joinedAt: sub.joinedAt,
        isActive: sub.isActive
      })),
      messages: chatbox.messages || [],
      subscriberCount: chatbox.subscriberCount
    };

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching chatbox:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chatbox', error: error.message });
  }
};

module.exports = {
  getChatboxMessages,
  sendMessage,
  getChatboxParticipants,
  getChatbox
};
