const mongoose = require('mongoose');

const propFirmPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a package name'],
    trim: true,
    maxlength: [200, 'Package name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  pricingType: {
    type: String,
    enum: ['one-time', 'monthly', 'performance-based', 'hybrid'],
    default: 'monthly'
  },
  features: [{
    type: String,
    required: true
  }],
  requirements: {
    minAccountSize: {
      type: Number,
      required: true,
      min: [0, 'Minimum account size cannot be negative']
    },
    supportedPropFirms: [{
      type: String,
      required: true
    }],
    recommendedPropFirms: [{
      name: {
        type: String,
        required: true
      },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
      },
      isRecommended: {
        type: Boolean,
        default: true
      },
      description: {
        type: String,
        default: ''
      }
    }],
    maxDrawdown: {
      type: Number,
      required: true,
      min: [0, 'Max drawdown cannot be negative'],
      max: [100, 'Max drawdown cannot exceed 100%']
    },
    profitTarget: {
      type: Number,
      required: true,
      min: [0, 'Profit target cannot be negative']
    },
    minTradingDays: {
      type: Number,
      default: 0,
      min: [0, 'Minimum trading days cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  maxClients: {
    type: Number,
    default: null // null means unlimited
  },
  currentClients: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0,
    min: [0, 'Success rate cannot be negative'],
    max: [100, 'Success rate cannot exceed 100%']
  },
  coversAllPhaseFees: {
    type: Boolean,
    default: false
  },
  serviceFee: {
    type: Number,
    required: [true, 'Please add a service fee'],
    min: [0, 'Service fee cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    estimatedDuration: String,
    supportLevel: String,
    riskLevel: String,
    communicationFrequency: String
  }
}, {
  timestamps: true
});

// Index for better query performance
propFirmPackageSchema.index({ isActive: 1, pricingType: 1 });
propFirmPackageSchema.index({ 'requirements.supportedPropFirms': 1 });

// Virtual for checking if package is full
propFirmPackageSchema.virtual('isFull').get(function() {
  if (this.maxClients === null) return false;
  return this.currentClients >= this.maxClients;
});

// Method to add client
propFirmPackageSchema.methods.addClient = function() {
  if (this.isFull) {
    throw new Error('Package is full');
  }
  
  this.currentClients += 1;
  return this.save();
};

// Method to remove client
propFirmPackageSchema.methods.removeClient = function() {
  this.currentClients = Math.max(0, this.currentClients - 1);
  return this.save();
};

// Static method to get active packages
propFirmPackageSchema.statics.getActivePackages = function() {
  return this.find({ isActive: true }).sort({ isPopular: -1, price: 1 });
};

module.exports = mongoose.model('PropFirmPackage', propFirmPackageSchema);
