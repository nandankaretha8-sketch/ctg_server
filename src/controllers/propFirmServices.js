const PropFirmService = require('../models/PropFirmService');
const PropFirmPackage = require('../models/PropFirmPackage');
const PropFirmServiceChat = require('../models/PropFirmServiceChat');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Create a new prop firm service application
const createPropFirmService = async (req, res) => {
  try {
    const { packageId, propFirmDetails, personalDetails } = req.body;
    const userId = req.user.id;
    
    // Debug logging removed for production
    
    // Validate and convert numeric fields in rules
    if (propFirmDetails.rules) {
      propFirmDetails.rules.maxDailyLoss = parseFloat(propFirmDetails.rules.maxDailyLoss) || 0;
      propFirmDetails.rules.maxTotalLoss = parseFloat(propFirmDetails.rules.maxTotalLoss) || 0;
      propFirmDetails.rules.profitTarget = parseFloat(propFirmDetails.rules.profitTarget) || 0;
      propFirmDetails.rules.tradingDays = parseInt(propFirmDetails.rules.tradingDays) || 0;
      // Allow -1 for unlimited days
      if (propFirmDetails.rules.tradingDays < 0 && propFirmDetails.rules.tradingDays !== -1) {
        propFirmDetails.rules.tradingDays = 0;
      }
    }
    
    // Validate and convert accountSize
    propFirmDetails.accountSize = parseFloat(propFirmDetails.accountSize) || 0;

    // Validate required fields
    if (!packageId || !propFirmDetails || !personalDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: packageId, propFirmDetails, personalDetails'
      });
    }

    // Set default firm name if not provided
    if (!propFirmDetails.firmName || propFirmDetails.firmName.trim() === '') {
      propFirmDetails.firmName = 'Custom Prop Firm';
    }

    // Check if package exists and is active
    const package = await PropFirmPackage.findById(packageId);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm package not found'
      });
    }

    if (!package.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This package is no longer available'
      });
    }

    // Check if package is full
    if (package.isFull) {
      return res.status(400).json({
        success: false,
        message: 'This package is currently full'
      });
    }

    // Allow users to have multiple prop firm services
    // Removed restriction that prevented multiple services per user

    // Validate prop firm details against package requirements
    if (propFirmDetails.accountSize < package.requirements.minAccountSize) {
      return res.status(400).json({
        success: false,
        message: `Account size must be at least $${package.requirements.minAccountSize}`
      });
    }

    if (!package.requirements.supportedPropFirms.includes(propFirmDetails.firmName)) {
      return res.status(400).json({
        success: false,
        message: `Prop firm ${propFirmDetails.firmName} is not supported for this package`
      });
    }

    // Calculate end date based on package type
    const startDate = new Date();
    let endDate;
    
    if (package.pricingType === 'one-time') {
      // For one-time payments, set end date based on typical service duration
      endDate = new Date(startDate.setMonth(startDate.getMonth() + 3)); // 3 months default
    } else {
      // For monthly subscriptions, set end date to 1 month from now
      endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
    }

    // Handle payment based on package service fee
    let payment = null;
    const totalAmount = package.serviceFee;
    
    if (totalAmount === 0) {
      // Free package - no payment required
      payment = new Payment({
        userId: userId,
        amount: 0,
        currency: 'USD',
        status: 'completed', // Mark as completed for free packages
        stripePaymentIntentId: `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stripeClientSecret: `free_secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          userEmail: personalDetails.emergencyContact || 'N/A',
          userName: personalDetails.preferredRiskLevel || 'N/A',
          challengeName: package.name,
          planName: package.name,
          planDuration: package.pricingType,
          type: 'prop_firm_service'
        }
      });
    } else {
      // Paid package - create pending payment (will be handled by Stripe payment flow)
      payment = new Payment({
        userId: userId,
        amount: totalAmount,
        currency: 'USD',
        status: 'pending',
        metadata: {
          userEmail: personalDetails.emergencyContact || 'N/A',
          userName: personalDetails.preferredRiskLevel || 'N/A',
          challengeName: package.name,
          planName: package.name,
          planDuration: package.pricingType,
          type: 'prop_firm_service',
          packageId: packageId
        }
      });
    }

    await payment.save();

    // Convert startDate string to Date object if needed
    const startDateForService = propFirmDetails.startDate ? new Date(propFirmDetails.startDate) : new Date();
    
    const service = new PropFirmService({
      user: userId,
      package: packageId,
      payment: payment._id,
      amount: totalAmount,
      endDate: endDate,
      status: totalAmount === 0 ? 'active' : 'pending', // Active for free, pending for paid
      propFirmDetails: {
        ...propFirmDetails,
        startDate: startDateForService, // Convert string to Date
        initialBalance: propFirmDetails.accountSize
      },
      performance: {
        initialBalance: propFirmDetails.accountSize,
        currentBalance: propFirmDetails.accountSize
      },
      metadata: {
        applicationData: personalDetails,
        verificationStatus: totalAmount === 0 ? 'verified' : 'pending'
      }
    });

    await service.save();

    // Increment currentClients count for the package
    await package.addClient();

    // Populate the response
    const populatedService = await PropFirmService.findById(service._id)
      .populate('user', 'firstName lastName email')
      .populate('package', 'name price features')
      .populate('payment', 'amount status createdAt');

    res.status(201).json({
      success: true,
      message: totalAmount === 0 
        ? 'Prop firm service application created and activated successfully!' 
        : 'Prop firm service application created successfully. Please complete payment to activate.',
      data: {
        service: populatedService,
        payment: payment,
        applicationId: service._id,
        isFree: totalAmount === 0,
        requiresPayment: totalAmount > 0
      }
    });
  } catch (error) {
    console.error('Error creating prop firm service:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create prop firm service',
      error: error.message
    });
  }
};

// Get user's prop firm services
const getUserPropFirmServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all' } = req.query;

    const filter = { user: userId };
    if (status !== 'all') filter.status = status;

    const services = await PropFirmService.find(filter)
      .populate('package', 'name price features pricingType requirements serviceFee')
      .populate('assignedManager', 'firstName lastName email')
      .populate('payment', 'amount status createdAt')
      .sort({ createdAt: -1 });

    // Remove account passwords from user services for security (users don't need to see their own passwords in API)
    const sanitizedServices = services.map(service => {
      const serviceData = service.toObject();
      if (serviceData.propFirmDetails && serviceData.propFirmDetails.accountPassword) {
        delete serviceData.propFirmDetails.accountPassword;
      }
      return serviceData;
    });

    res.status(200).json({
      success: true,
      data: sanitizedServices
    });
  } catch (error) {
    console.error('Error fetching user prop firm services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prop firm services',
      error: error.message
    });
  }
};

// Get all prop firm services (admin only)
const getAllPropFirmServices = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20, manager = 'all' } = req.query;

    const filter = {};
    if (status !== 'all') filter.status = status;
    if (manager !== 'all') filter.assignedManager = manager;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const services = await PropFirmService.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('package', 'name price features')
      .populate('assignedManager', 'firstName lastName email')
      .populate('payment', 'amount status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PropFirmService.countDocuments(filter);

    // Keep account passwords for admin users (this is an admin-only endpoint)
    const sanitizedServices = services.map(service => {
      const serviceData = service.toObject();
      // Admin users need to see passwords to trade on behalf of users
      return serviceData;
    });

    res.status(200).json({
      success: true,
      data: {
        services: sanitizedServices,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching prop firm services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prop firm services',
      error: error.message
    });
  }
};

// Get single prop firm service
const getPropFirmService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const service = await PropFirmService.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('package', 'name price features requirements')
      .populate('assignedManager', 'firstName lastName email')
      .populate('payment', 'amount status createdAt');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm service not found'
      });
    }

    // Check if user has access to this service
    if (userRole !== 'admin' && service.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Convert to object and handle password visibility
    const serviceData = service.toObject();
    
    // Remove account password from response for non-admin users for security
    if (userRole !== 'admin' && serviceData.propFirmDetails && serviceData.propFirmDetails.accountPassword) {
      delete serviceData.propFirmDetails.accountPassword;
    }

    res.status(200).json({
      success: true,
      data: serviceData
    });
  } catch (error) {
    console.error('Error fetching prop firm service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prop firm service',
      error: error.message
    });
  }
};

// Update prop firm service (admin only)
const updatePropFirmService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const service = await PropFirmService.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('user', 'firstName lastName email')
    .populate('package', 'name price features')
    .populate('assignedManager', 'firstName lastName email');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prop firm service updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating prop firm service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prop firm service',
      error: error.message
    });
  }
};

// Update service performance
const updateServicePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { performanceData } = req.body;

    const service = await PropFirmService.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm service not found'
      });
    }

    await service.updatePerformance(performanceData);

    // Check risk limits
    const riskCheck = service.checkRiskLimits();
    if (riskCheck.exceeded) {
      // Send alert to admin and user
      console.log(`Risk limit exceeded for service ${id}: ${riskCheck.reason}`);
    }

    res.status(200).json({
      success: true,
      message: 'Service performance updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service performance',
      error: error.message
    });
  }
};

// Add communication note
const addServiceNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const service = await PropFirmService.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm service not found'
      });
    }

    await service.addNote(message, userId);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: service
    });
  } catch (error) {
    console.error('Error adding service note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
};

// Get service statistics (admin only)
const getServiceStats = async (req, res) => {
  try {
    const stats = await PropFirmService.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$amount' },
          avgPerformance: { $avg: '$performance.totalProfit' }
        }
      }
    ]);

    const propFirmStats = await PropFirmService.aggregate([
      {
        $group: {
          _id: '$propFirmDetails.firmName',
          count: { $sum: 1 },
          avgPerformance: { $avg: '$performance.totalProfit' },
          successRate: {
            $avg: {
              $cond: [
                { $gt: ['$performance.totalProfit', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const responseStats = stats[0] || {
      total: 0,
      active: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
      avgPerformance: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...responseStats,
        propFirmBreakdown: propFirmStats
      }
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics',
      error: error.message
    });
  }
};

// Get chat messages for a service
const getServiceChat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user has access to this service
    const service = await PropFirmService.findOne({
      _id: id,
      user: userId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or access denied'
      });
    }

    // Get chat messages
    const messages = await PropFirmServiceChat.find({ service: id })
      .sort({ createdAt: 1 })
      .populate('sender', 'firstName lastName email role');

    res.status(200).json({
      success: true,
      data: messages.map(msg => ({
        _id: msg._id,
        message: msg.message,
        sender: msg.sender.role === 'admin' ? 'admin' : 'user',
        senderName: msg.sender.role === 'admin' ? 'Admin' : `${msg.sender.firstName} ${msg.sender.lastName}`,
        timestamp: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching service chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages',
      error: error.message
    });
  }
};

// Send a message in service chat
const sendServiceMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Verify user has access to this service
    const service = await PropFirmService.findOne({
      _id: id,
      user: userId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or access denied'
      });
    }

    // Create chat message
    const chatMessage = new PropFirmServiceChat({
      service: id,
      sender: userId,
      message: message.trim()
    });

    await chatMessage.save();

    // Populate sender info
    await chatMessage.populate('sender', 'firstName lastName email role');

    res.status(201).json({
      success: true,
      data: {
        _id: chatMessage._id,
        message: chatMessage.message,
        sender: chatMessage.sender.role === 'admin' ? 'admin' : 'user',
        senderName: chatMessage.sender.role === 'admin' ? 'Admin' : `${chatMessage.sender.firstName} ${chatMessage.sender.lastName}`,
        timestamp: chatMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending service message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

module.exports = {
  createPropFirmService,
  getUserPropFirmServices,
  getAllPropFirmServices,
  getPropFirmService,
  updatePropFirmService,
  updateServicePerformance,
  addServiceNote,
  getServiceStats,
  getServiceChat,
  sendServiceMessage
};
