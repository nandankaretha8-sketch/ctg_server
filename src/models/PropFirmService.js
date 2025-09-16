const mongoose = require('mongoose');

const propFirmServiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user ID']
  },
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropFirmPackage',
    required: [true, 'Please provide a package ID']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'completed', 'cancelled', 'failed'],
    default: 'pending'
  },
  cancellationReason: {
    type: String,
    required: false
  },
  cancelledAt: {
    type: Date,
    required: false
  },
  propFirmDetails: {
    firmName: {
      type: String,
      required: false,
      default: 'Custom Prop Firm'
    },
    accountId: {
      type: String,
      required: [true, 'Please provide account ID']
    },
    accountPassword: {
      type: String,
      required: [true, 'Please provide account password'],
      // Note: In production, this should be encrypted
    },
    server: {
      type: String,
      required: [true, 'Please provide server information']
    },
    accountSize: {
      type: Number,
      required: [true, 'Please provide account size']
    },
    accountType: {
      type: String,
      enum: ['challenge', 'live', 'evaluation'],
      required: [true, 'Please provide account type']
    },
    challengePhase: {
      type: String,
      enum: ['Phase 1', 'Phase 2', 'Live', 'N/A'],
      default: 'N/A'
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide account start date']
    },
    rules: {
      maxDailyLoss: {
        type: Number,
        required: true
      },
      maxTotalLoss: {
        type: Number,
        required: true
      },
      profitTarget: {
        type: Number,
        required: true
      },
      tradingDays: {
        type: Number,
        required: true,
        validate: {
          validator: function(value) {
            return value === -1 || value > 0; // -1 represents unlimited days
          },
          message: 'Trading days must be a positive number or -1 for unlimited'
        }
      },
      maxPositions: {
        type: Number,
        default: null
      },
      allowedInstruments: [String],
      restrictedInstruments: [String]
    }
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: [true, 'Please provide a payment ID']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide the service amount']
  },
  performance: {
    currentBalance: {
      type: Number,
      default: 0
    },
    initialBalance: {
      type: Number,
      required: true
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    totalLoss: {
      type: Number,
      default: 0
    },
    drawdown: {
      type: Number,
      default: 0
    },
    tradesCount: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    profitFactor: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  riskManagement: {
    isActive: {
      type: Boolean,
      default: true
    },
    maxRiskPerTrade: {
      type: Number,
      default: 2 // percentage
    },
    maxDailyRisk: {
      type: Number,
      default: 5 // percentage
    },
    emergencyStop: {
      type: Boolean,
      default: false
    },
    lastRiskCheck: {
      type: Date,
      default: Date.now
    }
  },
  communication: {
    lastReportSent: {
      type: Date,
      default: null
    },
    reportFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'in-app'],
      default: 'email'
    },
    notes: [{
      message: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  metadata: {
    applicationData: Object,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    },
    verificationNotes: String,
    specialInstructions: String,
    tags: [String]
  }
}, {
  timestamps: true
});

// Index for better query performance
propFirmServiceSchema.index({ user: 1, status: 1 });
propFirmServiceSchema.index({ assignedManager: 1, status: 1 });
propFirmServiceSchema.index({ status: 1, startDate: 1 });
propFirmServiceSchema.index({ 'propFirmDetails.firmName': 1 });

// Virtual for checking if service is active
propFirmServiceSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Virtual for calculating current performance percentage
propFirmServiceSchema.virtual('performancePercentage').get(function() {
  if (this.performance.initialBalance === 0) return 0;
  return ((this.performance.currentBalance - this.performance.initialBalance) / this.performance.initialBalance) * 100;
});

// Method to update performance
propFirmServiceSchema.methods.updatePerformance = function(performanceData) {
  this.performance = {
    ...this.performance,
    ...performanceData,
    lastUpdated: new Date()
  };
  
  // Calculate derived metrics
  this.performance.profitFactor = this.performance.totalProfit > 0 && this.performance.totalLoss > 0 
    ? this.performance.totalProfit / this.performance.totalLoss 
    : 0;
    
  return this.save();
};

// Method to add communication note
propFirmServiceSchema.methods.addNote = function(message, addedBy) {
  this.communication.notes.push({
    message,
    addedBy,
    timestamp: new Date()
  });
  return this.save();
};

// Method to check risk limits
propFirmServiceSchema.methods.checkRiskLimits = function() {
  const currentDrawdown = Math.abs(this.performance.drawdown);
  const maxAllowedDrawdown = this.propFirmDetails.rules.maxTotalLoss;
  
  if (currentDrawdown >= maxAllowedDrawdown) {
    this.riskManagement.emergencyStop = true;
    this.status = 'suspended';
    return { exceeded: true, reason: 'Maximum drawdown exceeded' };
  }
  
  return { exceeded: false };
};

// Static method to get active services
propFirmServiceSchema.statics.getActiveServices = function() {
  return this.find({ 
    status: 'active',
    endDate: { $gt: new Date() }
  }).populate('user package assignedManager');
};

module.exports = mongoose.model('PropFirmService', propFirmServiceSchema);
