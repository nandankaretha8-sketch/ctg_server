const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  referrer: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isUnique: {
    type: Boolean,
    default: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  page: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  isRegistered: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better performance
visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ ip: 1, createdAt: -1 });
visitorSchema.index({ userId: 1, createdAt: -1 });
visitorSchema.index({ isUnique: 1, createdAt: -1 });

// Static method to get visitor statistics
visitorSchema.statics.getVisitorStats = async function(startDate, endDate) {
  const matchStage = {};
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalVisitors: { $sum: 1 },
        uniqueVisitors: { $sum: { $cond: ['$isUnique', 1, 0] } },
        registeredVisitors: { $sum: { $cond: ['$isRegistered', 1, 0] } },
        totalSessions: { $addToSet: '$sessionId' },
        totalUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 0,
        totalVisitors: 1,
        uniqueVisitors: 1,
        registeredVisitors: 1,
        totalSessions: { $size: '$totalSessions' },
        totalUsers: { $size: { $filter: { input: '$totalUsers', cond: { $ne: ['$$this', null] } } } }
      }
    }
  ]);

  return stats[0] || {
    totalVisitors: 0,
    uniqueVisitors: 0,
    registeredVisitors: 0,
    totalSessions: 0,
    totalUsers: 0
  };
};

// Static method to get daily visitor trends
visitorSchema.statics.getDailyTrends = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalVisitors: { $sum: 1 },
        uniqueVisitors: { $sum: { $cond: ['$isUnique', 1, 0] } },
        registeredVisitors: { $sum: { $cond: ['$isRegistered', 1, 0] } }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

// Static method to get device/browser statistics
visitorSchema.statics.getDeviceStats = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get country statistics
visitorSchema.statics.getCountryStats = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$country',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);
};

module.exports = mongoose.model('Visitor', visitorSchema);
