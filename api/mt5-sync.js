const { updateAllUsersMT5Data } = require('../src/utils/mt5Scheduler');

/**
 * Vercel Cron Job Handler for MT5 Data Synchronization
 * This function should be called by Vercel Cron Jobs every hour
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
    console.log('Starting MT5 data synchronization...');
    await updateAllUsersMT5Data();
    console.log('MT5 data synchronization completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'MT5 data synchronization completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in MT5 data synchronization:', error);
    res.status(500).json({
      success: false,
      message: 'MT5 data synchronization failed',
      error: error.message
    });
  }
};

module.exports = handler;
