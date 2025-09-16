const MentorshipChatbox = require('../models/MentorshipChatbox');
const MentorshipPlan = require('../models/MentorshipPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Get mentorship chatbox
const getMentorshipChatbox = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    
    // Check if user is subscribed to the mentorship plan
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You are not subscribed to this mentorship plan'
      });
    }
    
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId })
      .populate('messages.sender', 'firstName lastName email')
      .populate('subscribers.user', 'firstName lastName email');
    
    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: 'Chatbox not found for this mentorship plan'
      });
    }
    
    // Filter messages to only show recent ones (last 50)
    const recentMessages = chatbox.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)
      .reverse();
    
    res.json({
      success: true,
      data: {
        chatbox: {
          ...chatbox.toObject(),
          messages: recentMessages
        },
        subscription: subscription
      }
    });
  } catch (error) {
    console.error('Error fetching mentorship chatbox:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chatbox',
      error: error.message
    });
  }
};

// Send message to mentorship chatbox
const sendMessage = async (req, res) => {
  try {
    const { planId } = req.params;
    const { content, messageType, lessonData, sessionData } = req.body;
    const userId = req.user.id;
    
    // Check if user is subscribed to the mentorship plan
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You are not subscribed to this mentorship plan'
      });
    }
    
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId });
    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: 'Chatbox not found'
      });
    }
    
    // Determine sender type (mentor or student)
    const user = await User.findById(userId);
    const isAdmin = user.role === 'admin';
    const senderType = isAdmin ? 'mentor' : 'student';
    
    // Check if students are allowed to send messages
    if (senderType === 'student' && !chatbox.settings.allowStudentMessages) {
      return res.status(403).json({
        success: false,
        message: 'Students are not allowed to send messages in this chatbox'
      });
    }
    
    // Create message data
    const messageData = {
      sender: userId,
      senderType: senderType,
      content: content,
      messageType: messageType || 'general',
      createdAt: new Date()
    };
    
    // Add lesson data if provided
    if (lessonData) {
      messageData.lessonData = lessonData;
    }
    
    // Add session data if provided
    if (sessionData) {
      messageData.sessionData = sessionData;
    }
    
    // Add message to chatbox
    await chatbox.addMessage(messageData);
    
    // Send push notification to other subscribers
    const otherSubscribers = chatbox.subscribers.filter(
      sub => sub.user.toString() !== userId.toString() && sub.isActive
    );
    
    if (otherSubscribers.length > 0) {
      // This would integrate with your existing notification system
      // For now, we'll just log it
      console.log(`Sending notification to ${otherSubscribers.length} subscribers`);
    }
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: messageData
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

// Get messages from mentorship chatbox
const getMessages = async (req, res) => {
  try {
    const { planId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    
    // Check if user is subscribed to the mentorship plan
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You are not subscribed to this mentorship plan'
      });
    }
    
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId })
      .populate('messages.sender', 'firstName lastName email');
    
    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: 'Chatbox not found'
      });
    }
    
    // Paginate messages
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const messages = chatbox.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(startIndex, endIndex)
      .reverse();
    
    res.json({
      success: true,
      data: {
        messages: messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(chatbox.messages.length / limit),
          totalMessages: chatbox.messages.length,
          hasNext: endIndex < chatbox.messages.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Pin message
const pinMessage = async (req, res) => {
  try {
    const { planId, messageId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin/mentor
    const user = await User.findById(userId);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only mentors can pin messages'
      });
    }
    
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId });
    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: 'Chatbox not found'
      });
    }
    
    const message = chatbox.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    message.isPinned = !message.isPinned;
    await chatbox.save();
    
    res.json({
      success: true,
      message: `Message ${message.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: message
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pin message',
      error: error.message
    });
  }
};

// Schedule session
const scheduleSession = async (req, res) => {
  try {
    const { planId } = req.params;
    const { scheduledDate, duration, topic, notes } = req.body;
    const userId = req.user.id;
    
    // Check if user is subscribed to the mentorship plan
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You are not subscribed to this mentorship plan'
      });
    }
    
    // Check session limits
    if (subscription.sessionCount >= subscription.maxSessions) {
      return res.status(400).json({
        success: false,
        message: 'You have reached your monthly session limit'
      });
    }
    
    const chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId });
    if (!chatbox) {
      return res.status(404).json({
        success: false,
        message: 'Chatbox not found'
      });
    }
    
    // Schedule the session
    await chatbox.scheduleSession(userId, {
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      topic: topic || 'General Discussion',
      notes: notes || '',
      status: 'scheduled'
    });
    
    // Update subscription session count
    subscription.sessionCount += 1;
    subscription.nextSessionDate = new Date(scheduledDate);
    subscription.sessionHistory.push({
      date: new Date(scheduledDate),
      duration: duration || 60,
      topic: topic || 'General Discussion',
      notes: notes || '',
      status: 'scheduled'
    });
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Session scheduled successfully',
      data: {
        scheduledDate: new Date(scheduledDate),
        duration: duration || 60,
        topic: topic || 'General Discussion',
        sessionCount: subscription.sessionCount,
        maxSessions: subscription.maxSessions
      }
    });
  } catch (error) {
    console.error('Error scheduling session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule session',
      error: error.message
    });
  }
};

// Get session history
const getSessionHistory = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    
    // Check if user is subscribed to the mentorship plan
    const subscription = await Subscription.findOne({
      user: userId,
      mentorshipPlan: planId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'You are not subscribed to this mentorship plan'
      });
    }
    
    res.json({
      success: true,
      data: {
        sessionHistory: subscription.sessionHistory,
        sessionCount: subscription.sessionCount,
        maxSessions: subscription.maxSessions,
        nextSessionDate: subscription.nextSessionDate
      }
    });
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session history',
      error: error.message
    });
  }
};

module.exports = {
  getMentorshipChatbox,
  sendMessage,
  getMessages,
  pinMessage,
  scheduleSession,
  getSessionHistory
};
