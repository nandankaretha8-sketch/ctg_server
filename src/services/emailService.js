const { Resend } = require('resend');

// Initialize Resend with API key, or null if not configured
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email templates
const emailTemplates = {
  welcome: (user) => ({
    subject: 'Welcome to CTG Trading! 🚀',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #C084FC 50%, #DDD6FE 75%, #F3E8FF 100%); min-height: 100vh;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; margin: 20px; padding: 50px 40px; text-align: center; box-shadow: 0 25px 50px rgba(139, 92, 246, 0.3);">
          
          <!-- Header with gradient text -->
          <div style="margin-bottom: 40px;">
            <h1 style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 15px; font-size: 36px; font-weight: 800; letter-spacing: -1px;">
              Welcome to CTG Trading! 🚀
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 18px; font-weight: 500;">
              Hi ${user.firstName || user.username}, your journey begins now!
            </p>
          </div>
          
          <!-- Account details card -->
          <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(168, 85, 247, 0.2);">
            <h3 style="color: #8B5CF6; margin: 0 0 20px; font-size: 20px; font-weight: 700;">Your Account Details</h3>
            <div style="text-align: left; max-width: 300px; margin: 0 auto;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
                <span style="color: #6B7280; font-weight: 600;">Username:</span>
                <span style="color: #8B5CF6; font-weight: 700;">${user.username}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
                <span style="color: #6B7280; font-weight: 600;">Email:</span>
                <span style="color: #8B5CF6; font-weight: 700;">${user.email}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #6B7280; font-weight: 600;">Name:</span>
                <span style="color: #8B5CF6; font-weight: 700;">${user.firstName || ''} ${user.lastName || ''}</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/login" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); transition: all 0.3s ease; letter-spacing: 0.5px;">
              🎯 Start Trading Now
            </a>
          </div>
          
          <!-- Features preview -->
          <div style="background: rgba(139, 92, 246, 0.05); border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 20px; font-size: 16px; font-weight: 700;">What's waiting for you:</h4>
            <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                <p style="color: #6B7280; margin: 0; font-size: 14px; font-weight: 600;">Live Trading</p>
              </div>
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
                <p style="color: #6B7280; margin: 0; font-size: 14px; font-weight: 600;">Challenges</p>
              </div>
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                <p style="color: #6B7280; margin: 0; font-size: 14px; font-weight: 600;">Analytics</p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <p style="color: #9CA3AF; font-size: 14px; margin: 40px 0 0; line-height: 1.6;">
            Thank you for joining CTG Trading! We're excited to have you on board and can't wait to see your trading journey unfold. 🌟
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (user, resetToken) => ({
    subject: '🔐 Password Reset - CTG Trading',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #C084FC 50%, #DDD6FE 75%, #F3E8FF 100%); min-height: 100vh;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; margin: 20px; padding: 50px 40px; text-align: center; box-shadow: 0 25px 50px rgba(139, 92, 246, 0.3);">
          
          <!-- Header with gradient text -->
          <div style="margin-bottom: 40px;">
            <h1 style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 15px; font-size: 36px; font-weight: 800; letter-spacing: -1px;">
              🔐 Password Reset Request
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 18px; font-weight: 500;">
              Hello ${user.firstName || user.username}, we received a request to reset your password
            </p>
          </div>
          
          <!-- Security notice -->
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 20px; margin: 30px 0; border: 1px solid rgba(245, 158, 11, 0.3);">
            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <p style="color: #92400E; margin: 0; font-size: 14px; font-weight: 600;">
              For your security, this link will expire in 10 minutes
            </p>
          </div>
          
          <!-- Reset button -->
          <div style="margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); transition: all 0.3s ease; letter-spacing: 0.5px;">
              🔑 Reset My Password
            </a>
          </div>
          
          <!-- Alternative method -->
          <div style="background: rgba(139, 92, 246, 0.05); border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 15px; font-size: 16px; font-weight: 700;">Can't click the button?</h4>
            <p style="color: #6B7280; margin: 0 0 15px; font-size: 14px;">
              Copy and paste this link into your browser:
            </p>
            <p style="color: #8B5CF6; margin: 0; font-size: 12px; word-break: break-all; background: rgba(139, 92, 246, 0.1); padding: 10px; border-radius: 8px;">
              ${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}
            </p>
          </div>
          
          <!-- Footer -->
          <p style="color: #9CA3AF; font-size: 14px; margin: 40px 0 0; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. Your account remains secure. 🛡️
          </p>
        </div>
      </div>
    `
  }),

  passwordResetSuccess: (user) => ({
    subject: '✅ Password Reset Successful - CTG Trading',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #C084FC 50%, #DDD6FE 75%, #F3E8FF 100%); min-height: 100vh;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; margin: 20px; padding: 50px 40px; text-align: center; box-shadow: 0 25px 50px rgba(139, 92, 246, 0.3);">
          
          <!-- Success icon -->
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
            <span style="color: white; font-size: 36px; font-weight: bold;">✓</span>
          </div>
          
          <!-- Header with gradient text -->
          <div style="margin-bottom: 40px;">
            <h1 style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 15px; font-size: 36px; font-weight: 800; letter-spacing: -1px;">
              ✅ Password Reset Successful
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 18px; font-weight: 500;">
              Hello ${user.firstName || user.username}, your password has been successfully updated
            </p>
          </div>
          
          <!-- Success message -->
          <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(16, 185, 129, 0.2);">
            <h3 style="color: #065F46; margin: 0 0 15px; font-size: 20px; font-weight: 700;">🛡️ Your Account is Secure</h3>
            <p style="color: #047857; margin: 0; font-size: 16px; line-height: 1.6;">
              Your password has been successfully changed. Your account is now protected with your new password.
            </p>
          </div>
          
          <!-- Login button -->
          <div style="margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/login" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); transition: all 0.3s ease; letter-spacing: 0.5px;">
              🚀 Login to Your Account
            </a>
          </div>
          
          <!-- Security tips -->
          <div style="background: rgba(139, 92, 246, 0.05); border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 20px; font-size: 16px; font-weight: 700;">🔒 Security Tips</h4>
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="color: #8B5CF6; margin-right: 10px; font-size: 16px;">🔐</span>
                <p style="color: #6B7280; margin: 0; font-size: 14px;">Use a strong, unique password</p>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="color: #8B5CF6; margin-right: 10px; font-size: 16px;">🔄</span>
                <p style="color: #6B7280; margin: 0; font-size: 14px;">Change passwords regularly</p>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #8B5CF6; margin-right: 10px; font-size: 16px;">📱</span>
                <p style="color: #6B7280; margin: 0; font-size: 14px;">Enable two-factor authentication</p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <p style="color: #9CA3AF; font-size: 14px; margin: 40px 0 0; line-height: 1.6;">
            If you didn't make this change, please contact our support team immediately. Your account security is our priority. 🛡️
          </p>
        </div>
      </div>
    `
  }),

  otp: (user, otp) => ({
    subject: 'Your Password Reset Code - CTG Trading',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #C084FC 50%, #DDD6FE 75%, #F3E8FF 100%); min-height: 100vh;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; margin: 20px; padding: 50px 40px; text-align: center; box-shadow: 0 25px 50px rgba(139, 92, 246, 0.3);">
          
          <!-- Header with gradient text -->
          <div style="margin-bottom: 40px;">
            <h1 style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 15px; font-size: 36px; font-weight: 800; letter-spacing: -1px;">
              Password Reset Code 🔐
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 18px; font-weight: 500;">
              Hi ${user.firstName || user.username}, here's your verification code
            </p>
          </div>
          
          <!-- OTP Code Card -->
          <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); border-radius: 20px; padding: 40px; margin: 30px 0; border: 1px solid rgba(168, 85, 247, 0.2);">
            <h3 style="color: #8B5CF6; margin: 0 0 20px; font-size: 20px; font-weight: 700;">Your Verification Code</h3>
            <div style="background: white; border-radius: 16px; padding: 30px; margin: 20px 0; border: 2px solid #8B5CF6; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.2);">
              <div style="font-size: 48px; font-weight: 800; color: #8B5CF6; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #6B7280; margin: 0; font-size: 16px; line-height: 1.6;">
              Enter this code in the verification form to reset your password.
            </p>
          </div>
          
          <!-- Important Notice -->
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(245, 158, 11, 0.2);">
            <h3 style="color: #D97706; margin: 0 0 15px; font-size: 18px; font-weight: 700;">⏰ Important</h3>
            <p style="color: #92400E; margin: 0; font-size: 14px; line-height: 1.6;">
              This code will expire in <strong>5 minutes</strong>. If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <!-- Security Tips -->
          <div style="background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(14, 165, 233, 0.2);">
            <h3 style="color: #0369A1; margin: 0 0 15px; font-size: 18px; font-weight: 700;">🔒 Security Tips</h3>
            <ul style="color: #0C4A6E; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; text-align: left;">
              <li>Never share this code with anyone</li>
              <li>CTG Trading will never ask for your verification code</li>
              <li>If you didn't request this, please contact support</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(139, 92, 246, 0.1);">
            <p style="color: #6B7280; margin: 0 0 10px; font-size: 14px;">
              Thank you for using CTG Trading!
            </p>
            <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `
  }),

  registrationVerification: (user, otp) => ({
    subject: 'Verify Your Email - CTG Trading Registration 🚀',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 25%, #C084FC 50%, #DDD6FE 75%, #F3E8FF 100%); min-height: 100vh;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; margin: 20px; padding: 50px 40px; text-align: center; box-shadow: 0 25px 50px rgba(139, 92, 246, 0.3);">
          
          <!-- Header with gradient text -->
          <div style="margin-bottom: 40px;">
            <h1 style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 15px; font-size: 36px; font-weight: 800; letter-spacing: -1px;">
              Welcome to CTG Trading! 🚀
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 18px; font-weight: 500;">
              Hi ${user.firstName || user.username}, please verify your email to complete registration
            </p>
          </div>
          
          <!-- OTP Code Card -->
          <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); border-radius: 20px; padding: 40px; margin: 30px 0; border: 1px solid rgba(168, 85, 247, 0.2);">
            <h3 style="color: #8B5CF6; margin: 0 0 20px; font-size: 20px; font-weight: 700;">Your Email Verification Code</h3>
            <div style="background: white; border-radius: 16px; padding: 30px; margin: 20px 0; border: 2px solid #8B5CF6; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.2);">
              <div style="font-size: 48px; font-weight: 800; color: #8B5CF6; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #6B7280; margin: 0; font-size: 16px; line-height: 1.6;">
              Enter this code in the registration form to verify your email address and complete your account setup.
            </p>
          </div>
          
          <!-- Account Details Preview -->
          <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(34, 197, 94, 0.2);">
            <h3 style="color: #16A34A; margin: 0 0 20px; font-size: 18px; font-weight: 700;">📋 Your Account Details</h3>
            <div style="text-align: left; max-width: 300px; margin: 0 auto;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.1);">
                <span style="color: #6B7280; font-weight: 600;">Username:</span>
                <span style="color: #16A34A; font-weight: 700;">${user.username}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(34, 197, 94, 0.1);">
                <span style="color: #6B7280; font-weight: 600;">Email:</span>
                <span style="color: #16A34A; font-weight: 700;">${user.email}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #6B7280; font-weight: 600;">Name:</span>
                <span style="color: #16A34A; font-weight: 700;">${user.firstName || ''} ${user.lastName || ''}</span>
              </div>
            </div>
          </div>
          
          <!-- Important Notice -->
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(245, 158, 11, 0.2);">
            <h3 style="color: #D97706; margin: 0 0 15px; font-size: 18px; font-weight: 700;">⏰ Important</h3>
            <p style="color: #92400E; margin: 0; font-size: 14px; line-height: 1.6;">
              This verification code will expire in <strong>5 minutes</strong>. If you didn't create this account, please ignore this email.
            </p>
          </div>
          
          <!-- Next Steps -->
          <div style="background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%); border-radius: 20px; padding: 30px; margin: 30px 0; border: 1px solid rgba(14, 165, 233, 0.2);">
            <h3 style="color: #0369A1; margin: 0 0 15px; font-size: 18px; font-weight: 700;">🎯 What's Next?</h3>
            <ul style="color: #0C4A6E; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; text-align: left;">
              <li>Enter the verification code above in the registration form</li>
              <li>Complete your account setup</li>
              <li>Start exploring trading challenges and competitions</li>
              <li>Join our community of successful traders</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(139, 92, 246, 0.1);">
            <p style="color: #9CA3AF; margin: 0 0 10px; font-size: 14px;">
              Welcome to the CTG Trading family! 🚀
            </p>
            <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
              If you have any questions, feel free to contact our support team.
            </p>
          </div>
        </div>
      </div>
    `
  })
};

// Email service functions
const emailService = {
  async sendWelcomeEmail(user) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping welcome email.');
        return { message: 'Email service not configured' };
      }

      const template = emailTemplates.welcome(user);
      
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
      }

      console.log('Welcome email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Welcome email error:', error);
      throw error;
    }
  },

  async sendPasswordResetEmail(user, resetToken) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping password reset email.');
        return { message: 'Email service not configured' };
      }

      const template = emailTemplates.passwordReset(user, resetToken);
      
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
      }

      console.log('Password reset email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Password reset email error:', error);
      throw error;
    }
  },

  async sendPasswordResetSuccessEmail(user) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping password reset success email.');
        return { message: 'Email service not configured' };
      }

      const template = emailTemplates.passwordResetSuccess(user);
      
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Error sending password reset success email:', error);
        throw new Error('Failed to send password reset success email');
      }

      console.log('Password reset success email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Password reset success email error:', error);
      throw error;
    }
  },

  async sendOTPEmail(user, otp) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping OTP email.');
        return { message: 'Email service not configured' };
      }

      const template = emailTemplates.otp(user, otp);
      
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
      }

      console.log('OTP email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('OTP email error:', error);
      throw error;
    }
  },

  async sendRegistrationVerificationEmail(user, otp) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping registration verification email.');
        return { message: 'Email service not configured' };
      }

      const template = emailTemplates.registrationVerification(user, otp);
      
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error('Error sending registration verification email:', error);
        throw new Error('Failed to send registration verification email');
      }

      console.log('Registration verification email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Registration verification email error:', error);
      throw error;
    }
  },

  async sendCustomEmail(to, subject, html) {
    try {
      if (!resend) {
        console.warn('Resend not configured. Skipping custom email.');
        return { message: 'Email service not configured' };
      }

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error('Error sending custom email:', error);
        throw new Error('Failed to send email');
      }

      console.log('Custom email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Custom email error:', error);
      throw error;
    }
  }
};

module.exports = emailService;
