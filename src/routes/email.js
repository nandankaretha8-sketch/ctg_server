const express = require('express');
const emailService = require('../services/emailService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Test email service
// @route   POST /api/email/test
// @access  Private (Admin only)
router.post('/test', protect, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide to, subject, and message',
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; text-align: center;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">C</span>
          </div>
          <h1 style="color: white; margin: 0 0 10px; font-size: 28px;">Test Email</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0 0 30px; font-size: 16px;">This is a test email from CTG Trading</p>
          
          <div style="background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 20px; margin: 20px 0;">
            <p style="color: rgba(255, 255, 255, 0.9); margin: 0 0 15px;">${message}</p>
          </div>
          
          <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 30px 0 0;">
            This is a test email sent from the CTG Trading platform.
          </p>
        </div>
      </div>
    `;

    await emailService.sendCustomEmail(to, subject, html);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

module.exports = router;
