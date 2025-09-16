const Visitor = require('../models/Visitor');
const User = require('../models/User');

// Get visitor statistics
const getVisitorStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get visitor statistics
    const visitorStats = await Visitor.getVisitorStats(startDate, endDate);
    
    // Get total registered users
    const totalUsers = await User.countDocuments();
    
    // Get daily trends for the last 30 days
    const dailyTrends = await Visitor.getDailyTrends(30);
    
    // Get device statistics
    const deviceStats = await Visitor.getDeviceStats();
    
    // Get country statistics
    const countryStats = await Visitor.getCountryStats();
    
    // Calculate conversion rate (registered visitors / total visitors)
    const conversionRate = visitorStats.totalVisitors > 0 
      ? ((visitorStats.registeredVisitors / visitorStats.totalVisitors) * 100).toFixed(2)
      : 0;
    
    // Calculate bounce rate (single page visits / total visits)
    const singlePageVisits = await Visitor.countDocuments({
      duration: { $lt: 5 }, // Less than 5 seconds
      ...(startDate && endDate ? {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      } : {})
    });
    
    const bounceRate = visitorStats.totalVisitors > 0 
      ? ((singlePageVisits / visitorStats.totalVisitors) * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      data: {
        ...visitorStats,
        totalUsers,
        conversionRate: parseFloat(conversionRate),
        bounceRate: parseFloat(bounceRate),
        dailyTrends,
        deviceStats,
        countryStats
      }
    });
  } catch (error) {
    console.error('Error getting visitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get visitor statistics'
    });
  }
};

// Get visitor analytics dashboard data
const getVisitorAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    // Get overall statistics
    const stats = await Visitor.getVisitorStats();
    
    // Get daily trends
    const dailyTrends = await Visitor.getDailyTrends(days);
    
    // Get hourly distribution for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const hourlyStats = await Visitor.aggregate([
      {
        $match: {
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    // Get top pages
    const topPages = await Visitor.aggregate([
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } }
        }
      },
      {
        $sort: { views: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get referrer statistics
    const referrerStats = await Visitor.aggregate([
      {
        $match: {
          referrer: { $ne: '' }
        }
      },
      {
        $group: {
          _id: '$referrer',
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
    
    res.json({
      success: true,
      data: {
        stats,
        dailyTrends,
        hourlyStats,
        topPages,
        referrerStats
      }
    });
  } catch (error) {
    console.error('Error getting visitor analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get visitor analytics'
    });
  }
};

// Get real-time visitor data
const getRealTimeVisitors = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get visitors from the last hour
    const recentVisitors = await Visitor.find({
      createdAt: { $gte: oneHourAgo }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('userId', 'firstName lastName email')
    .select('-userAgent -sessionId');
    
    // Get current active sessions (visitors with recent activity)
    const activeSessions = await Visitor.distinct('sessionId', {
      updatedAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) } // Last 30 minutes
    });
    
    res.json({
      success: true,
      data: {
        recentVisitors,
        activeSessions: activeSessions.length,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Error getting real-time visitors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time visitor data'
    });
  }
};

module.exports = {
  getVisitorStats,
  getVisitorAnalytics,
  getRealTimeVisitors
};
