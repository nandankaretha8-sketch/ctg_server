const { updateChallengeStatuses } = require('../src/controllers/challenges');
const { updateAllUsersMT5Data } = require('../src/utils/mt5Scheduler');
const webPushService = require('../src/services/webPushService');

/**
 * Vercel Cron Job Handler for Challenge Status Updates
 * This function should be called by Vercel Cron Jobs every minute
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
    console.log('Starting scheduled challenge status update...');
    await updateChallengeStatuses();
    console.log('Challenge status update completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Challenge status update completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in scheduled challenge status update:', error);
    res.status(500).json({
      success: false,
      message: 'Challenge status update failed',
      error: error.message
    });
  }
};

module.exports = handler;
