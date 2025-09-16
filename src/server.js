const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { startChallengeStatusScheduler } = require('./utils/scheduler');
const { startMT5Scheduler } = require('./utils/mt5Scheduler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const challengeRoutes = require('./routes/challenges');
const leaderboardRoutes = require('./routes/leaderboard');
const settingsRoutes = require('./routes/settings');
const visitorRoutes = require('./routes/visitors');
const signalPlanRoutes = require('./routes/signalPlans');
const supportRoutes = require('./routes/support');
const subscriptionRoutes = require('./routes/subscriptions');
const propFirmPackageRoutes = require('./routes/propFirmPackages');
const propFirmServiceRoutes = require('./routes/propFirmServices');
const youtubeVideoRoutes = require('./routes/youtubeVideos');

// Import middleware
const { trackVisitor, trackPageView } = require('./middleware/visitorTracking');

const app = express();

// Connect to database
connectDB();

// Start schedulers
startChallengeStatusScheduler();
startMT5Scheduler();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
const getAllowedOrigins = () => {
  const origins = [];
  
  // Add primary frontend URL from environment
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add additional frontend URLs from environment (comma-separated)
  if (process.env.ADDITIONAL_FRONTEND_URLS) {
    const additionalUrls = process.env.ADDITIONAL_FRONTEND_URLS.split(',').map(url => url.trim());
    origins.push(...additionalUrls);
  }
  
  // Add development URLs only in development mode
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:5173',
      'http://192.168.31.228:8080'
    );
  }
  
  // Add Vercel preview URLs if in production
  if (process.env.NODE_ENV === 'production') {
    origins.push(
      'https://*.vercel.app',
      'https://*.vercel.com'
    );
  }
  
  return origins;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Visitor tracking middleware
app.use(trackVisitor);
app.use(trackPageView);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CTG Trading API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/signal-plans', signalPlanRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/prop-firm-packages', propFirmPackageRoutes);
app.use('/api/prop-firm-services', propFirmServiceRoutes);
app.use('/api/youtube-videos', youtubeVideoRoutes);
app.use('/api/footer-settings', require('./routes/footerSettings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/email', require('./routes/email'));
// VAPID key endpoint (public, no auth required) - MUST be before notifications route
app.get('/api/notifications/vapid-key', (req, res) => {
  const { getVapidPublicKey } = require('./services/webPushService');
  try {
    const vapidPublicKey = getVapidPublicKey();
    res.json({
      success: true,
      data: {
        vapidPublicKey
      }
    });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID public key',
      error: error.message
    });
  }
});

// Push subscription registration endpoint (requires auth) - MUST be before notifications route
app.post('/api/notifications/subscribe', require('./middleware/auth').protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'Push subscription is required'
      });
    }

    const User = require('./models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize pushSubscriptions array if it doesn't exist
    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }

    // Check if subscription already exists
    const existingSubscription = user.pushSubscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = subscription.keys;
      existingSubscription.updatedAt = new Date();
    } else {
      // Add new subscription
      user.pushSubscriptions.push({
        ...subscription,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Push subscription registered successfully'
    });
  } catch (error) {
    console.error('Error registering push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push subscription',
      error: error.message
    });
  }
});

// Test push notification endpoint (requires auth) - MUST be before notifications route
app.post('/api/notifications/test', require('./middleware/auth').protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require('./models/User');
    const { sendPushNotificationToMultiple } = require('./services/webPushService');

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No push subscriptions found for this user'
      });
    }

    const testPayload = {
      title: '🧪 Test Push Notification',
      body: 'This is a test push notification to verify the system is working!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'test-notification',
      requireInteraction: true,
      silent: false,
      data: {
        url: '/dashboard',
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    const result = await sendPushNotificationToMultiple(
      user.pushSubscriptions,
      testPayload,
      userId
    );

    res.json({
      success: true,
      message: 'Test push notification sent',
      data: result
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test push notification',
      error: error.message
    });
  }
});

// Debug push notification endpoint (requires auth) - MUST be before notifications route
app.post('/api/notifications/debug', require('./middleware/auth').protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require('./models/User');

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const debugInfo = {
      userId: user._id,
      email: user.email,
      pushSubscriptionsCount: user.pushSubscriptions?.length || 0,
      pushSubscriptions: user.pushSubscriptions?.map(sub => ({
        endpoint: sub.endpoint?.substring(0, 50) + '...',
        hasKeys: !!(sub.keys && sub.keys.p256dh && sub.keys.auth),
        p256dhLength: sub.keys?.p256dh?.length || 0,
        authLength: sub.keys?.auth?.length || 0,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      })) || []
    };

    res.json({
      success: true,
      message: 'Debug information retrieved',
      data: debugInfo
    });
  } catch (error) {
    console.error('Error getting debug information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get debug information',
      error: error.message
    });
  }
});

app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chatboxes', require('./routes/chatboxes'));
app.use('/api/mentorship-plans', require('./routes/mentorshipPlans'));
app.use('/api/mentorship-chatboxes', require('./routes/mentorshipChatboxes'));
app.use('/api/mentorship-chat', require('./routes/mentorshipChat'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🌐 Server accessible at: http://localhost:${PORT} and http://192.168.31.228:${PORT}`);
});

// Start scheduled notification processor (commented out for now)
// const { processScheduledNotifications } = require('./controllers/notifications');
// setInterval(processScheduledNotifications, 60000); // Check every minute
console.log('📱 Scheduled notification processor started');

// Start push notification cleanup scheduler
const webPushService = require('./services/webPushService');
setInterval(async () => {
  try {
    console.log('🧹 Starting push notification cleanup...');
    const result = await webPushService.cleanupAllExpiredSubscriptions();
    if (result.totalCleaned > 0) {
      console.log(`🧹 Push notification cleanup completed: ${result.totalCleaned} expired subscriptions removed`);
    }
  } catch (error) {
    console.error('Error in push notification cleanup:', error);
  }
}, 24 * 60 * 60 * 1000); // Run once every 24 hours
console.log('🧹 Push notification cleanup scheduler started (runs every 24 hours)');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
