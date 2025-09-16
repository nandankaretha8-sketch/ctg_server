const User = require('../models/User');
const Challenge = require('../models/Challenge');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is requesting their own data or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user data',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is updating their own data or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      avatar: req.body.avatar,
      preferences: req.body.preferences,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const updatedUser = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is requesting their own stats or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user stats',
      });
    }

    // Get user's challenges
    const challenges = await Challenge.find({
      'participants.user': req.params.id,
    }).populate('participants.user', 'username');

    const userParticipations = challenges.map(challenge => {
      const participation = challenge.participants.find(
        p => p.user._id.toString() === req.params.id
      );
      return {
        challengeId: challenge._id,
        challengeTitle: challenge.title,
        status: participation.status,
        profit: participation.profit,
        currentBalance: participation.currentBalance,
        joinedAt: participation.joinedAt,
      };
    });

    // Calculate additional stats
    const totalChallenges = userParticipations.length;
    const completedChallenges = userParticipations.filter(p => p.status === 'completed').length;
    const totalProfit = userParticipations.reduce((sum, p) => sum + p.profit, 0);
    const winRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
        stats: {
          totalChallenges,
          completedChallenges,
          totalProfit,
          winRate: Math.round(winRate * 100) / 100,
          participations: userParticipations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update all users' trading stats
// @route   POST /api/users/update-all-stats
// @access  Private (Admin only)
const updateAllUsersStats = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action',
      });
    }

    const Challenge = require('../models/Challenge');
    
    // Get all users
    const users = await User.find({});
    let updatedCount = 0;

    for (const user of users) {
      try {
        // Get user's challenges
        const challenges = await Challenge.find({
          'participants.user': user._id,
        });

        const userParticipations = challenges.map(challenge => {
          const participation = challenge.participants.find(
            p => p.user.toString() === user._id.toString()
          );
          return {
            status: participation.status,
            profit: participation.profit || 0,
          };
        });

        // Calculate stats
        const totalChallenges = userParticipations.length;
        const completedChallenges = userParticipations.filter(p => p.status === 'completed').length;
        const totalProfit = userParticipations.reduce((sum, p) => sum + p.profit, 0);
        const winRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;

        // Update user's trading stats
        await User.findByIdAndUpdate(user._id, {
          'tradingStats.totalChallenges': totalChallenges,
          'tradingStats.completedChallenges': completedChallenges,
          'tradingStats.totalProfit': totalProfit,
          'tradingStats.winRate': Math.round(winRate * 100) / 100,
        });

        updatedCount++;
      } catch (error) {
        console.error(`Error updating stats for user ${user._id}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated trading stats for ${updatedCount} users`,
      data: { updatedCount }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  updateAllUsersStats,
};
