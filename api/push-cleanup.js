const webPushService = require('../src/services/webPushService');

/**
 * Vercel Cron Job Handler for Push Notification Cleanup
 * This function should be called by Vercel Cron Jobs daily
 */
const handler = async (req, res) => {
  // Only allow POST requests (Vercel cron jobs send POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('Starting push notification cleanup...');
    const result = await webPushService.cleanupAllExpiredSubscriptions();
    console.log(`Push notification cleanup completed: ${result.totalCleaned} expired subscriptions removed`);
    
    res.status(200).json({
      success: true,
      message: 'Push notification cleanup completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in push notification cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Push notification cleanup failed',
      error: error.message
    });
  }
};

module.exports = handler;
