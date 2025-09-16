const PropFirmPackage = require('../models/PropFirmPackage');
const PropFirmService = require('../models/PropFirmService');

// Get all active prop firm packages
const getPropFirmPackages = async (req, res) => {
  try {
    const packages = await PropFirmPackage.getActivePackages();
    
    res.status(200).json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Error fetching prop firm packages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prop firm packages',
      error: error.message
    });
  }
};

// Get single prop firm package by ID
const getPropFirmPackage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const package = await PropFirmPackage.findById(id);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm package not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: package
    });
  } catch (error) {
    console.error('Error fetching prop firm package:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prop firm package',
      error: error.message
    });
  }
};

// Create new prop firm package (admin only)
const createPropFirmPackage = async (req, res) => {
  try {
    const packageData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const newPackage = await PropFirmPackage.create(packageData);
    
    res.status(201).json({
      success: true,
      message: 'Prop firm package created successfully',
      data: newPackage
    });
  } catch (error) {
    console.error('Error creating prop firm package:', error);
    
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
      message: 'Failed to create prop firm package',
      error: error.message
    });
  }
};

// Update prop firm package (admin only)
const updatePropFirmPackage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const package = await PropFirmPackage.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm package not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Prop firm package updated successfully',
      data: package
    });
  } catch (error) {
    console.error('Error updating prop firm package:', error);
    
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
      message: 'Failed to update prop firm package',
      error: error.message
    });
  }
};

// Delete prop firm package (admin only)
const deletePropFirmPackage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if package exists
    const package = await PropFirmPackage.findById(id);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Prop firm package not found'
      });
    }
    
    // Count active services for information
    const activeServices = await PropFirmService.countDocuments({
      package: id,
      status: { $in: ['active', 'pending'] }
    });
    
    // Update all services associated with this package to 'cancelled' status
    await PropFirmService.updateMany(
      { package: id },
      { 
        status: 'cancelled',
        cancellationReason: 'Package deleted by admin',
        cancelledAt: new Date()
      }
    );
    
    // Delete the package
    await PropFirmPackage.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: `Prop firm package deleted successfully. ${activeServices} associated services have been cancelled.`
    });
  } catch (error) {
    console.error('Error deleting prop firm package:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prop firm package',
      error: error.message
    });
  }
};

// Get package statistics (admin only)
const getPackageStats = async (req, res) => {
  try {
    const stats = await PropFirmPackage.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          popular: { $sum: { $cond: [{ $eq: ['$isPopular', true] }, 1, 0] } },
          totalClients: { $sum: '$currentClients' }
        }
      }
    ]);

    const pricingStats = await PropFirmPackage.aggregate([
      {
        $group: {
          _id: '$pricingType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          totalClients: { $sum: '$currentClients' }
        }
      }
    ]);

    const responseStats = stats[0] || {
      total: 0,
      active: 0,
      popular: 0,
      totalClients: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...responseStats,
        pricingBreakdown: pricingStats
      }
    });
  } catch (error) {
    console.error('Error fetching package stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch package statistics',
      error: error.message
    });
  }
};

module.exports = {
  getPropFirmPackages,
  getPropFirmPackage,
  createPropFirmPackage,
  updatePropFirmPackage,
  deletePropFirmPackage,
  getPackageStats
};
