const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/auth');
const {
  generateForgotPasswordOTP,
  verifyOTP,
  resetPasswordWithOTP,
  resendOTP,
  generateRegistrationOTP,
  verifyRegistrationOTP,
  resendRegistrationOTP,
} = require('../controllers/otp');
const { protect } = require('../middleware/auth');
const { getVapidPublicKey } = require('../services/webPushService');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one symbol'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
], register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
], login);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', logout);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
router.put('/updatedetails', protect, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
], updateDetails);

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
router.put('/updatepassword', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one symbol'),
], updatePassword);

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
], forgotPassword);

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one symbol'),
], resetPassword);

// @desc    Generate OTP for forgot password
// @route   POST /api/auth/forgot-password-otp
// @access  Public
router.post('/forgot-password-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
], generateForgotPasswordOTP);

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
], verifyOTP);

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password-otp
// @access  Public
router.post('/reset-password-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one symbol'),
], resetPasswordWithOTP);

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
], resendOTP);

// @desc    Register push subscription
// @route   POST /api/auth/register-push-subscription
// @access  Private
router.post('/register-push-subscription', protect, [
  body('subscription.endpoint')
    .notEmpty()
    .withMessage('Subscription endpoint is required'),
  body('subscription.keys.p256dh')
    .notEmpty()
    .withMessage('Subscription p256dh key is required'),
  body('subscription.keys.auth')
    .notEmpty()
    .withMessage('Subscription auth key is required'),
], registerPushSubscription);

// @desc    Unregister push subscription
// @route   POST /api/auth/unregister-push-subscription
// @access  Private
router.post('/unregister-push-subscription', protect, [
  body('endpoint')
    .notEmpty()
    .withMessage('Subscription endpoint is required'),
], unregisterPushSubscription);

// @desc    Get VAPID public key
// @route   GET /api/auth/vapid-public-key
// @access  Public
router.get('/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    data: {
      publicKey: getVapidPublicKey()
    }
  });
});

// @desc    Send registration verification OTP
// @route   POST /api/auth/send-registration-otp
// @access  Public
router.post('/send-registration-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
], generateRegistrationOTP);

// @desc    Verify registration OTP and complete registration
// @route   POST /api/auth/verify-registration-otp
// @access  Public
router.post('/verify-registration-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one symbol'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
], verifyRegistrationOTP);

// @desc    Resend registration verification OTP
// @route   POST /api/auth/resend-registration-otp
// @access  Public
router.post('/resend-registration-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
], resendRegistrationOTP);

module.exports = router;
