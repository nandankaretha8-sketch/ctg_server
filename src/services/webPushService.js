const webpush = require('web-push');

// VAPID keys from environment variables
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

// Initialize web-push with VAPID keys
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.warn('⚠️  VAPID keys are not set. Web push notifications will not work.');
} else {
  webpush.setVapidDetails(
    'mailto:admin@ctg.com', // Contact email for push service
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ Web Push VAPID keys configured successfully');
}

// Get VAPID public key for frontend
const getVapidPublicKey = () => {
  return vapidKeys.publicKey;
};

// Send push notification to multiple subscriptions
const sendPushNotificationToMultiple = async (subscriptions, payload, userId = null) => {
  const results = {
    totalSent: 0,
    deliveredCount: 0,
    failedCount: 0,
    errors: [],
    expiredSubscriptions: []
  };

  // Check if VAPID keys are configured
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    results.errors.push('VAPID details not set. Cannot send push notifications.');
    return results;
  }

  const notificationPayload = JSON.stringify(payload);

  // Process subscriptions in parallel for better performance
  const promises = subscriptions.map(async (subscription) => {
    results.totalSent++;
    try {
      await webpush.sendNotification(subscription, notificationPayload);
      results.deliveredCount++;
      console.log(`✅ Push notification sent successfully to: ${subscription.endpoint.substring(0, 50)}...`);
    } catch (error) {
      results.failedCount++;
      results.errors.push({ 
        subscription: subscription.endpoint, 
        error: error.message 
      });
      
      // Handle expired subscriptions (410 Gone)
      if (error.statusCode === 410) {
        console.log('🔄 Subscription expired, marking for removal');
        results.expiredSubscriptions.push(subscription);
      } else {
        console.error(`❌ Failed to send push notification: ${error.message}`);
      }
    }
  });

  // Wait for all notifications to complete
  await Promise.allSettled(promises);

  // Clean up expired subscriptions if userId is provided
  if (results.expiredSubscriptions.length > 0 && userId) {
    await cleanupExpiredSubscriptions(userId, results.expiredSubscriptions);
  }

  return results;
};

// Clean up expired push subscriptions from database
const cleanupExpiredSubscriptions = async (userId, expiredSubscriptions) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (user && user.pushSubscriptions) {
      // Remove expired subscriptions
      const validSubscriptions = user.pushSubscriptions.filter(sub => 
        !expiredSubscriptions.some(expired => expired.endpoint === sub.endpoint)
      );
      
      user.pushSubscriptions = validSubscriptions;
      await user.save();
      
      console.log(`🧹 Cleaned up ${expiredSubscriptions.length} expired push subscriptions for user ${userId}`);
    }
  } catch (error) {
    console.error('Error cleaning up expired subscriptions:', error);
  }
};

// Proactively clean up expired subscriptions for all users
const cleanupAllExpiredSubscriptions = async () => {
  try {
    const User = require('../models/User');
    const users = await User.find({ pushSubscriptions: { $exists: true, $ne: [] } });
    
    let totalCleaned = 0;
    
    for (const user of users) {
      if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) continue;
      
      const validSubscriptions = [];
      const expiredSubscriptions = [];
      
      // Test each subscription
      for (const subscription of user.pushSubscriptions) {
        try {
          // Send a test notification to check if subscription is valid
          await webpush.sendNotification(subscription, JSON.stringify({
            title: 'Test',
            body: 'Test notification',
            icon: '/icon-192x192.png'
          }));
          validSubscriptions.push(subscription);
        } catch (error) {
          if (error.statusCode === 410) {
            expiredSubscriptions.push(subscription);
          } else {
            // For other errors, keep the subscription (might be temporary)
            validSubscriptions.push(subscription);
          }
        }
      }
      
      // Update user with only valid subscriptions
      if (expiredSubscriptions.length > 0) {
        user.pushSubscriptions = validSubscriptions;
        await user.save();
        totalCleaned += expiredSubscriptions.length;
        console.log(`🧹 Cleaned up ${expiredSubscriptions.length} expired subscriptions for user ${user._id}`);
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`🧹 Total expired subscriptions cleaned up: ${totalCleaned}`);
    }
    
    return { totalCleaned, usersProcessed: users.length };
  } catch (error) {
    console.error('Error in proactive cleanup:', error);
    return { totalCleaned: 0, usersProcessed: 0, error: error.message };
  }
};

module.exports = {
  getVapidPublicKey,
  sendPushNotificationToMultiple,
  cleanupAllExpiredSubscriptions,
};
