const MentorshipChatbox = require('../models/MentorshipChatbox');
const MentorshipPlan = require('../models/MentorshipPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Get chat messages for a mentorship plan
const getChatMessages = async (req, res) => {
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
      .populate('messages.sender', 'firstName lastName email');
    
    if (!chatbox) {
      // Create a new chatbox if it doesn't exist
      const newChatbox = new MentorshipChatbox({
        mentorshipPlan: planId,
        messages: [],
        subscribers: [{ user: userId }]
      });
      await newChatbox.save();
      
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get recent messages (last 50)
    const recentMessages = chatbox.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)
      .reverse()
      .map(message => ({
        _id: message._id,
        sender: message.sender._id.toString() === userId ? 'user' : 'admin',
        message: message.content,
        timestamp: message.createdAt,
        senderName: message.sender.firstName + ' ' + message.sender.lastName
      }));
    
    res.json({
      success: true,
      data: recentMessages
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages'
    });
  }
};

// Send a chat message
const sendChatMessage = async (req, res) => {
  try {
    const { planId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
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
    
    // Find or create chatbox
    let chatbox = await MentorshipChatbox.findOne({ mentorshipPlan: planId });
    
    if (!chatbox) {
      chatbox = new MentorshipChatbox({
        mentorshipPlan: planId,
        messages: [],
        subscribers: [{ user: userId }]
      });
    }
    
    // Add message to chatbox
    chatbox.messages.push({
      sender: userId,
      content: message.trim(),
      createdAt: new Date()
    });
    
    await chatbox.save();
    
    // Populate the sender information for the response
    await chatbox.populate('messages.sender', 'firstName lastName email');
    
    const newMessage = chatbox.messages[chatbox.messages.length - 1];
    
    res.json({
      success: true,
      data: {
        _id: newMessage._id,
        sender: 'user',
        message: newMessage.content,
        timestamp: newMessage.createdAt,
        senderName: newMessage.sender.firstName + ' ' + newMessage.sender.lastName
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

module.exports = {
  getChatMessages,
  sendChatMessage
};
