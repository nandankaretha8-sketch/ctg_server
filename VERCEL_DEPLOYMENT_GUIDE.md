# Vercel Backend Deployment Guide

## Overview
This guide will help you deploy the CTG Trading backend to Vercel as serverless functions.

## Prerequisites
1. Vercel account (free tier available)
2. MongoDB Atlas account (for production database)
3. All environment variables configured

## Environment Variables Setup

### CORS Configuration
The backend now uses environment variables for CORS configuration instead of hardcoded URLs:

- `FRONTEND_URL`: Your primary frontend domain (required)
- `ADDITIONAL_FRONTEND_URLS`: Comma-separated list of additional frontend domains (optional)
- Development URLs are automatically added when `NODE_ENV=development`
- Vercel preview URLs are automatically added when `NODE_ENV=production`

### Required Environment Variables
Set these in your Vercel project dashboard under Settings > Environment Variables:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ctg-trading
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# CORS
FRONTEND_URL=https://your-frontend-domain.vercel.app
# Additional frontend URLs (comma-separated for multiple domains)
ADDITIONAL_FRONTEND_URLS=https://your-staging-domain.vercel.app,https://your-custom-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Admin
ADMIN_EMAIL=admin@ctg.com
ADMIN_PASSWORD=admin123

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# Push Notifications
NOTIFICATION_DEFAULT_TTL=86400
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_BATCH_SIZE=500

# Cloudinary
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

# VAPID Keys (for web push)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
From the backend directory:
```bash
cd backend
vercel --prod
```

### 4. Set Environment Variables
After deployment, go to your Vercel dashboard:
1. Select your project
2. Go to Settings > Environment Variables
3. Add all the environment variables listed above

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

## Serverless Function Structure

The backend has been restructured for Vercel:

### Main API (`/api/index.js`)
- Handles all API routes
- Database connection with retry logic
- Optimized for serverless environment

### Scheduled Tasks
- `/api/scheduled-tasks` - Challenge status updates (every minute)
- `/api/mt5-sync` - MT5 data synchronization (every hour)
- `/api/push-cleanup` - Push notification cleanup (daily)

## Cron Jobs Configuration

Vercel cron jobs are configured in `vercel.json`:
- Challenge status updates: Every minute
- MT5 sync: Every hour at minute 0
- Push cleanup: Daily at midnight UTC

## Important Notes

### Database Connection
- Uses connection pooling optimized for serverless
- Automatic reconnection on cold starts
- No persistent connections (serverless limitation)

### Scheduled Tasks
- Background schedulers removed from main server
- Replaced with Vercel cron jobs
- Each task runs as separate serverless function

### Performance Considerations
- Cold start latency on first request
- Database connections are established per request
- Consider using connection pooling for high traffic

### Limitations
- Maximum execution time: 30 seconds (main API), 5 minutes (MT5 sync)
- No persistent state between requests
- Cron jobs have limited execution time

## Testing Deployment

### 1. Health Check
```bash
curl https://your-backend-domain.vercel.app/api/health
```

### 2. Test API Endpoints
```bash
# Test authentication
curl -X POST https://your-backend-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 3. Test Cron Jobs
```bash
# Test scheduled tasks (requires authentication)
curl -X POST https://your-backend-domain.vercel.app/api/scheduled-tasks
```

## Monitoring

### Vercel Dashboard
- Monitor function executions
- Check error logs
- View performance metrics

### Database Monitoring
- Monitor MongoDB Atlas for connection patterns
- Check for connection leaks
- Monitor query performance

## Troubleshooting

### Common Issues

1. **Database Connection Timeouts**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string format
   - Check network connectivity

2. **Environment Variables Not Loading**
   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly
   - Redeploy after setting variables

3. **Cron Jobs Not Running**
   - Verify cron schedule format
   - Check Vercel cron job logs
   - Ensure functions are deployed correctly

4. **Cold Start Issues**
   - Consider using Vercel Pro for faster cold starts
   - Optimize database queries
   - Use connection pooling

### Debug Commands
```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Check function details
vercel inspect
```

## Production Checklist

- [ ] All environment variables configured
- [ ] MongoDB Atlas production database set up
- [ ] CORS configured for production frontend URL
- [ ] Stripe keys updated to live keys
- [ ] Firebase credentials configured
- [ ] VAPID keys generated and configured
- [ ] Health check endpoint responding
- [ ] Cron jobs scheduled and running
- [ ] Error monitoring set up
- [ ] Performance monitoring configured

## Support

For issues with deployment:
1. Check Vercel function logs
2. Verify environment variables
3. Test database connectivity
4. Check cron job execution logs
