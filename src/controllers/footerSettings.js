const FooterSettings = require('../models/FooterSettings');

// @desc    Get footer settings (public)
// @route   GET /api/footer-settings
// @access  Public
exports.getFooterSettings = async (req, res) => {
  try {
    const settings = await FooterSettings.findOne({ isActive: true });
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        companyName: 'CTG',
        companyDescription: 'Empowering traders worldwide with cutting-edge competition platforms, signal services, and prop firm solutions. Join thousands of successful traders.',
        email: 'support@ctgtrading.com',
        phone: '+1 (555) 123-4567',
        address: 'New York, NY 10001',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: '',
          youtube: ''
        },
        newsletter: {
          title: 'Stay Updated',
          description: 'Get the latest trading insights, competition updates, and exclusive offers delivered to your inbox.',
          isActive: true
        },
        legalLinks: {
          privacyPolicy: '/privacy',
          termsOfService: '/terms',
          cookiePolicy: '/cookies'
        }
      };
      
      return res.status(200).json({ 
        success: true, 
        data: defaultSettings 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get footer settings (admin)
// @route   GET /api/footer-settings/admin
// @access  Private/Admin
exports.getFooterSettingsAdmin = async (req, res) => {
  try {
    const settings = await FooterSettings.findOne({ user: req.user.id });
    
    if (!settings) {
      // Create default settings for admin if none exist
      const defaultSettings = {
        companyName: 'CTG',
        companyDescription: 'Empowering traders worldwide with cutting-edge competition platforms, signal services, and prop firm solutions. Join thousands of successful traders.',
        email: 'support@ctgtrading.com',
        phone: '+1 (555) 123-4567',
        address: 'New York, NY 10001',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: '',
          youtube: ''
        },
        newsletter: {
          title: 'Stay Updated',
          description: 'Get the latest trading insights, competition updates, and exclusive offers delivered to your inbox.',
          isActive: true
        },
        legalLinks: {
          privacyPolicy: '/privacy',
          termsOfService: '/terms',
          cookiePolicy: '/cookies'
        },
        isActive: true,
        user: req.user.id
      };
      
      const newSettings = await FooterSettings.create(defaultSettings);
      return res.status(200).json({ 
        success: true, 
        data: newSettings 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create footer settings
// @route   POST /api/footer-settings
// @access  Private/Admin
exports.createFooterSettings = async (req, res) => {
  try {
    // Check if settings already exist for this user
    const existingSettings = await FooterSettings.findOne({ user: req.user.id });
    
    if (existingSettings) {
      return res.status(400).json({
        success: false,
        message: 'Footer settings already exist. Use update instead.'
      });
    }

    req.body.user = req.user.id;
    const settings = await FooterSettings.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('Error creating footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update footer settings
// @route   PUT /api/footer-settings/:id
// @access  Private/Admin
exports.updateFooterSettings = async (req, res) => {
  try {
    let settings = await FooterSettings.findById(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: `Footer settings not found with id of ${req.params.id}`
      });
    }

    // Make sure user owns the settings
    if (settings.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update these settings`
      });
    }

    settings = await FooterSettings.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('Error updating footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete footer settings
// @route   DELETE /api/footer-settings/:id
// @access  Private/Admin
exports.deleteFooterSettings = async (req, res) => {
  try {
    const settings = await FooterSettings.findById(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: `Footer settings not found with id of ${req.params.id}`
      });
    }

    // Make sure user owns the settings
    if (settings.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete these settings`
      });
    }

    await settings.deleteOne();

    res.status(200).json({ 
      success: true, 
      data: {} 
    });
  } catch (error) {
    console.error('Error deleting footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Toggle footer settings active status
// @route   PATCH /api/footer-settings/:id/toggle
// @access  Private/Admin
exports.toggleFooterSettingsStatus = async (req, res) => {
  try {
    const settings = await FooterSettings.findById(req.params.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: `Footer settings not found with id of ${req.params.id}`
      });
    }

    // Make sure user owns the settings
    if (settings.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update these settings`
      });
    }

    settings.isActive = !settings.isActive;
    await settings.save();

    res.status(200).json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    console.error('Error toggling footer settings status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};