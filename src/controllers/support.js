const Support = require('../models/Support');
const User = require('../models/User');

// Get all support tickets for admin
const getAllSupportTickets = async (req, res) => {
  try {
    const {
      status = 'all',
      priority = 'all',
      category = 'all',
      assignedTo = 'all',
      page = 1,
      limit = 20,
      sortBy = 'lastMessage',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status !== 'all') filter.status = status;
    if (priority !== 'all') filter.priority = priority;
    if (category !== 'all') filter.category = category;
    if (assignedTo !== 'all') filter.assignedTo = assignedTo;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tickets = await Support.find(filter)
      .populate('user', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Support.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: error.message
    });
  }
};

// Get support tickets for a specific user
const getUserSupportTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all', page = 1, limit = 10 } = req.query;

    const filter = { user: userId };
    if (status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tickets = await Support.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ lastMessage: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Support.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: error.message
    });
  }
};

// Get a specific support ticket
const getSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await Support.findById(id)
      .populate('user', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName email avatar');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user has access to this ticket
    if (userRole !== 'admin' && ticket.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark messages as read for the current user
    await ticket.markAsRead(userRole === 'admin' ? 'admin' : 'user');

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket',
      error: error.message
    });
  }
};

// Create a new support ticket
const createSupportTicket = async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    const ticket = new Support({
      user: userId,
      subject,
      category: category || 'general',
      priority: priority || 'medium',
      messages: [{
        sender: userId,
        senderType: 'user',
        message,
        timestamp: new Date()
      }],
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        source: 'web'
      }
    });

    await ticket.save();

    const populatedTicket = await Support.findById(ticket._id)
      .populate('user', 'firstName lastName email avatar')
      .populate('messages.sender', 'firstName lastName email avatar');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: populatedTicket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message
    });
  }
};

// Add a message to a support ticket
const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const ticket = await Support.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user has access to this ticket
    if (userRole !== 'admin' && ticket.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const senderType = userRole === 'admin' ? 'admin' : 'user';

    // Add the message
    await ticket.addMessage(userId, senderType, message, attachments);

    // Update ticket status if admin is responding
    if (userRole === 'admin' && ticket.status === 'open') {
      ticket.status = 'in_progress';
      await ticket.save();
    }

    const updatedTicket = await Support.findById(id)
      .populate('user', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName email avatar');

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// Update support ticket (admin only)
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, category, assignedTo, tags } = req.body;

    const ticket = await Support.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Update fields
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    if (tags) ticket.tags = tags;

    await ticket.save();

    const updatedTicket = await Support.findById(id)
      .populate('user', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.sender', 'firstName lastName email avatar');

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support ticket',
      error: error.message
    });
  }
};

// Delete support ticket (admin only)
const deleteSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Support.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    await Support.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Support ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete support ticket',
      error: error.message
    });
  }
};

// Get support statistics (admin only)
const getSupportStats = async (req, res) => {
  try {
    const stats = await Support.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
        }
      }
    ]);

    const categoryStats = await Support.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const responseStats = stats[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...responseStats,
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllSupportTickets,
  getUserSupportTickets,
  getSupportTicket,
  createSupportTicket,
  addMessage,
  updateSupportTicket,
  deleteSupportTicket,
  getSupportStats
};
