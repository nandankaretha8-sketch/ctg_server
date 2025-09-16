const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const emailService = require('../services/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Update user's trading stats with real data from challenges
    await updateUserTradingStats(user._id);

    // Fetch updated user with real trading stats
    const updatedUser = await User.findById(user._id);

    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Update user's trading stats with real data from challenges
    await updateUserTradingStats(req.user.id);

    // Fetch updated user data
    const updatedUser = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        tradingStats: updatedUser.tradingStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update user's trading stats
const updateUserTradingStats = async (userId) => {
  try {
    const Challenge = require('../models/Challenge');
    
    // Get user's challenges
    const challenges = await Challenge.find({
      'participants.user': userId,
    });

    const userParticipations = challenges.map(challenge => {
      const participation = challenge.participants.find(
        p => p.user.toString() === userId.toString()
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
    await User.findByIdAndUpdate(userId, {
      'tradingStats.totalChallenges': totalChallenges,
      'tradingStats.completedChallenges': completedChallenges,
      'tradingStats.totalProfit': totalProfit,
      'tradingStats.winRate': Math.round(winRate * 100) / 100, // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error updating user trading stats:', error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect',
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email',
      });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    try {
      // Send password reset email using Resend
      await emailService.sendPasswordResetEmail(user, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send password reset success email
    try {
      await emailService.sendPasswordResetSuccessEmail(user);
    } catch (emailError) {
      console.error('Failed to send password reset success email:', emailError);
      // Don't fail password reset if email fails
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tradingStats: user.tradingStats,
      },
    });
};

// @desc    Register push subscription
// @route   POST /api/auth/register-push-subscription
// @access  Private

// @desc    Register push subscription
// @route   POST /api/auth/register-push-subscription
// @access  Private
const registerPushSubscription = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Push subscription is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if subscription already exists
    const existingSubscription = user.pushSubscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );

    if (!existingSubscription) {
      user.pushSubscriptions.push(subscription);
      await user.save();
      console.log(`✅ Push subscription registered for user: ${user.email}`);
    }

    res.status(200).json({
      success: true,
      message: 'Push subscription registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unregister push subscription
// @route   POST /api/auth/unregister-push-subscription
// @access  Private
const unregisterPushSubscription = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription endpoint is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove subscription from user's pushSubscriptions array
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    await user.save();

    console.log(`✅ Push subscription unregistered for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Push subscription unregistered successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  registerPushSubscription,
  unregisterPushSubscription,
};
