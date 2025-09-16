const { validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');

// @desc    Generate and send OTP for password reset
// @route   POST /api/auth/forgot-password-otp
// @access  Public
const generateForgotPasswordOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address',
      });
    }

    // Generate OTP
    const otpDoc = await OTP.createOTP(email, 'password_reset');

    try {
      // Send OTP email
      await emailService.sendOTPEmail(user, otpDoc.otp);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        data: {
          email: email,
          expiresIn: 5 * 60, // 5 minutes in seconds
        },
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      
      // Delete the OTP if email fails
      await OTP.deleteOne({ _id: otpDoc._id });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const result = await OTP.verifyOTP(email, otp, 'password_reset');

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: email,
        verified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password-otp
// @access  Public
const resetPasswordWithOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email, otp, newPassword } = req.body;

    // Verify OTP again (in case it was verified in a previous step)
    const otpDoc = await OTP.findOne({
      email,
      otp,
      purpose: 'password_reset',
      isUsed: true, // OTP should be used (verified)
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new OTP.',
      });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpDoc._id });

    // Send password reset success email
    try {
      await emailService.sendPasswordResetSuccessEmail(user);
    } catch (emailError) {
      console.error('Failed to send password reset success email:', emailError);
      // Don't fail password reset if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address',
      });
    }

    // Check if there's a recent OTP request (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      purpose: 'password_reset',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }, // 1 minute ago
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new OTP',
      });
    }

    // Generate new OTP
    const otpDoc = await OTP.createOTP(email, 'password_reset');

    try {
      // Send OTP email
      await emailService.sendOTPEmail(user, otpDoc.otp);

      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully to your email',
        data: {
          email: email,
          expiresIn: 5 * 60, // 5 minutes in seconds
        },
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      
      // Delete the OTP if email fails
      await OTP.deleteOne({ _id: otpDoc._id });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and send OTP for registration verification
// @route   POST /api/auth/send-registration-otp
// @access  Public
const generateRegistrationOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email, username, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Create temporary user object for email
    const tempUser = {
      email,
      username,
      firstName,
      lastName,
    };

    // Generate OTP
    const otpDoc = await OTP.createOTP(email, 'registration_verification');

    try {
      // Send registration verification email
      await emailService.sendRegistrationVerificationEmail(tempUser, otpDoc.otp);

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully to your email',
        data: {
          email: email,
          expiresIn: 5 * 60, // 5 minutes in seconds
        },
      });
    } catch (emailError) {
      console.error('Failed to send registration verification email:', emailError);
      
      // Delete the OTP if email fails
      await OTP.deleteOne({ _id: otpDoc._id });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify registration OTP and complete registration
// @route   POST /api/auth/verify-registration-otp
// @access  Public
const verifyRegistrationOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email, otp, username, password, firstName, lastName } = req.body;

    // Verify OTP
    const otpResult = await OTP.verifyOTP(email, otp, 'registration_verification');
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if username is already taken (double check)
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      isEmailVerified: true, // Mark as verified since OTP was verified
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Send token response
    const token = user.getSignedJwtToken();
    
    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend registration OTP
// @route   POST /api/auth/resend-registration-otp
// @access  Public
const resendRegistrationOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg),
      });
    }

    const { email, username, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if there's a recent OTP request (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      purpose: 'registration_verification',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }, // 1 minute ago
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new verification code',
      });
    }

    // Create temporary user object for email
    const tempUser = {
      email,
      username,
      firstName,
      lastName,
    };

    // Generate new OTP
    const otpDoc = await OTP.createOTP(email, 'registration_verification');

    try {
      // Send registration verification email
      await emailService.sendRegistrationVerificationEmail(tempUser, otpDoc.otp);

      res.status(200).json({
        success: true,
        message: 'New verification code sent successfully to your email',
        data: {
          email: email,
          expiresIn: 5 * 60, // 5 minutes in seconds
        },
      });
    } catch (emailError) {
      console.error('Failed to send registration verification email:', emailError);
      
      // Delete the OTP if email fails
      await OTP.deleteOne({ _id: otpDoc._id });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateForgotPasswordOTP,
  verifyOTP,
  resetPasswordWithOTP,
  resendOTP,
  generateRegistrationOTP,
  verifyRegistrationOTP,
  resendRegistrationOTP,
};
