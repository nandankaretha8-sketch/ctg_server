const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Leaderboard = require('../models/Leaderboard');
const { triggerManualUpdate } = require('../utils/mt5Scheduler');

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
const getLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const challengeId = req.query.challengeId;

    let leaderboardData;
    let totalCount;

    if (challengeId) {
      // Get challenge-specific leaderboard
      const challenge = await Challenge.findById(challengeId).populate('participants.user', 'username firstName lastName avatar');
      console.log('Challenge found:', challenge ? challenge.name : 'Not found');
      console.log('Challenge participants:', challenge ? challenge.participants.length : 0);
      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Get challenge-specific leaderboard from actual participant data
      console.log('Processing challenge participants:', challenge.participants.length);
      leaderboardData = challenge.participants.map(participant => {
        console.log('Participant _id:', participant._id);
        console.log('Participant user:', participant.user);
        return {
          userId: participant.user._id.toString(),
          participantId: participant._id.toString(), // Add participant ID for updates
          username: participant.user.username || participant.user.firstName + ' ' + participant.user.lastName,
          firstName: participant.user.firstName,
          lastName: participant.user.lastName,
          avatar: participant.user.avatar || '',
          accountId: participant.mt5Account?.id || 'N/A',
          balance: participant.currentBalance || challenge.accountSize,
          equity: participant.currentBalance || challenge.accountSize,
          profit: participant.profit || 0,
          profitPercent: participant.profitPercent || (() => {
            const balance = participant.currentBalance || challenge.accountSize;
            const profit = participant.profit || 0;
            return balance > 0 ? (profit / balance) * 100 : 0;
          })(),
          margin: 0,
          freeMargin: participant.currentBalance || challenge.accountSize,
          marginLevel: 0,
          positions: [],
          updatedAt: participant.updatedAt || new Date(),
          // Include MT5 account info
          mt5Account: participant.mt5Account || null
        };
      }).sort((a, b) => (b.profitPercent || 0) - (a.profitPercent || 0));
      
      // Apply pagination
      totalCount = leaderboardData.length;
      leaderboardData = leaderboardData.slice(skip, skip + limit);
    } else {
      // Get global leaderboard
      leaderboardData = await Leaderboard.getLeaderboard(limit, skip);
      totalCount = await Leaderboard.countDocuments();
    }

    // Add rank to each user
    const leaderboard = leaderboardData.map((user, index) => ({
      userId: user.userId.toString(),
      participantId: user.participantId || null, // Include participant ID for challenge-specific entries
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      accountId: user.accountId,
      balance: user.balance,
      equity: user.equity,
      profit: user.profit,
      profitPercent: user.profitPercent,
      margin: user.margin,
      freeMargin: user.freeMargin,
      marginLevel: user.marginLevel,
      positions: user.positions || [],
      rank: skip + index + 1,
      updatedAt: user.updatedAt,
      // Add MT5 account info for challenge-specific leaderboard
      mt5Account: user.mt5Account || null
    }));

    res.status(200).json({
      success: true,
      leaderboard: leaderboard,
      count: leaderboard.length,
      total: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user rank
// @route   GET /api/leaderboard/rank
// @access  Private
const getUserRank = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's rank from leaderboard
    const rankData = await Leaderboard.getUserRank(userId);

    if (!rankData || rankData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in leaderboard',
      });
    }

    const userRank = rankData[0];

    // Get total users in leaderboard
    const totalUsers = await Leaderboard.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        rank: userRank.rank,
        totalUsers,
        percentile: Math.round(((totalUsers - userRank.rank + 1) / totalUsers) * 100),
        stats: {
          profitPercent: userRank.profitPercent,
          balance: userRank.balance,
          equity: userRank.equity,
          profit: userRank.profit,
          updatedAt: userRank.updatedAt
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually trigger MT5 data update
// @route   POST /api/leaderboard/update-mt5
// @access  Private (Admin only)
const updateMT5Data = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const results = await triggerManualUpdate();

    res.status(200).json({
      success: true,
      message: 'MT5 data update completed successfully',
      results: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard statistics
// @route   GET /api/leaderboard/stats
// @access  Public
const getLeaderboardStats = async (req, res, next) => {
  try {
    const challengeId = req.query.challengeId;
    
    let stats;
    
    if (challengeId) {
      // Get challenge-specific stats
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }
      
      const participantIds = challenge.participants.map(p => p.user);
      const totalParticipants = await Leaderboard.countDocuments({
        userId: { $in: participantIds }
      });
      
      const topPerformer = await Leaderboard.findOne({
        userId: { $in: participantIds }
      }).sort({ profitPercent: -1 }).lean();
      
      stats = {
        totalParticipants,
        topPerformer: topPerformer ? {
          username: topPerformer.username,
          profitPercent: topPerformer.profitPercent
        } : null
      };
    } else {
      // Get global stats
      const totalUsers = await Leaderboard.countDocuments();
      const topPerformer = await Leaderboard.findOne().sort({ profitPercent: -1 }).lean();
      
      stats = {
        totalUsers,
        topPerformer: topPerformer ? {
          username: topPerformer.username,
          profitPercent: topPerformer.profitPercent
        } : null
      };
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leaderboard entry (admin only)
// @route   PUT /api/leaderboard/:id
// @access  Private (Admin only)
const updateLeaderboardEntry = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;

    const updatedEntry = await Leaderboard.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard entry not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leaderboard entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete leaderboard entry (admin only)
// @route   DELETE /api/leaderboard/:id
// @access  Private (Admin only)
const deleteLeaderboardEntry = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { id } = req.params;

    const deletedEntry = await Leaderboard.findByIdAndDelete(id);

    if (!deletedEntry) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard entry not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leaderboard entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leaderboard entries for admin management
// @route   GET /api/leaderboard/admin/all
// @access  Private (Admin only)
const getAllLeaderboardEntries = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { page = 1, limit = 50, sortBy = 'profitPercent', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const entries = await Leaderboard.find()
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username firstName lastName email');

    const total = await Leaderboard.countDocuments();

    res.status(200).json({
      success: true,
      data: entries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard,
  getUserRank,
  updateMT5Data,
  getLeaderboardStats,
  updateLeaderboardEntry,
  deleteLeaderboardEntry,
  getAllLeaderboardEntries,
};
