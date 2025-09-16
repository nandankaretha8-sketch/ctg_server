# Resend Email Service Setup

This guide will help you set up Resend for email services in your CTG Trading application.

## 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

## 2. Get Your API Key

1. Log in to your Resend dashboard
2. Go to the "API Keys" section
3. Click "Create API Key"
4. Give it a name (e.g., "CTG Trading API")
5. Copy the API key (starts with `re_`)

## 3. Set Up Your Domain (Optional but Recommended)

For production use, you should set up your own domain:

1. In the Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS setup instructions
5. Wait for verification

## 4. Configure Environment Variables

Update your `.env` file with the following:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important Notes:**
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- For development, you can use `onboarding@resend.dev` as the from email
- For production, use your verified domain email

## 5. Test the Email Service

You can test the email service using the test endpoint:

```bash
# Test email endpoint (requires authentication)
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email from CTG Trading"
  }'
```

## 6. Email Templates

The application includes the following email templates:

### Welcome Email
- Sent automatically when a user registers
- Includes user details and login link
- Beautiful glass-morphism design matching your app

### Password Reset Email
- Sent when user requests password reset
- Includes secure reset link with 10-minute expiration
- Professional design with clear call-to-action

### Password Reset Success Email
- Sent after successful password reset
- Confirms the password change
- Includes login link

## 7. Email Features

- **Beautiful Templates**: Glass-morphism design matching your app's UI
- **Responsive**: Works on all devices
- **Secure**: Uses Resend's secure infrastructure
- **Reliable**: Built on Resend's delivery network
- **Customizable**: Easy to modify templates in `src/services/emailService.js`

## 8. Production Considerations

1. **Domain Setup**: Use your own domain for better deliverability
2. **Rate Limits**: Resend has generous rate limits (3,000 emails/day on free plan)
3. **Monitoring**: Monitor email delivery in the Resend dashboard
4. **Error Handling**: The app gracefully handles email failures without breaking user registration

## 9. Troubleshooting

### Common Issues:

1. **Invalid API Key**: Make sure your API key is correct and starts with `re_`
2. **Domain Not Verified**: For production, ensure your domain is verified
3. **Rate Limits**: Check if you've exceeded Resend's rate limits
4. **Spam Folder**: Check spam folder for test emails

### Debug Mode:

Enable debug logging by checking the console output when emails are sent. The service logs success and error messages.

## 10. Free Plan Limits

Resend's free plan includes:
- 3,000 emails per month
- 100 emails per day
- Basic analytics
- API access

For higher volumes, consider upgrading to a paid plan.

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Support: [resend.com/support](https://resend.com/support)
