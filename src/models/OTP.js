const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  otp: {
    type: String,
    required: [true, 'Please add an OTP'],
    length: 6,
  },
  purpose: {
    type: String,
    enum: ['password_reset', 'email_verification', 'registration_verification'],
    default: 'password_reset',
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  },
}, {
  timestamps: true,
});

// Index for efficient queries
OTPSchema.index({ email: 1, purpose: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

// Static method to generate OTP
OTPSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create OTP for email
OTPSchema.statics.createOTP = async function(email, purpose = 'password_reset') {
  // Delete any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose });
  
  const otp = this.generateOTP();
  
  const otpDoc = await this.create({
    email,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
  
  return otpDoc;
};

// Static method to verify OTP
OTPSchema.statics.verifyOTP = async function(email, otp, purpose = 'password_reset') {
  const otpDoc = await this.findOne({
    email,
    otp,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
  
  if (!otpDoc) {
    return { valid: false, message: 'Invalid or expired OTP' };
  }
  
  // Mark OTP as used
  otpDoc.isUsed = true;
  await otpDoc.save();
  
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = mongoose.model('OTP', OTPSchema);
