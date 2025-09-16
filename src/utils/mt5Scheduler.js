const cron = require('node-cron');
const User = require('../models/User');
const { processAllUsersMT5Data } = require('../services/mt5Service');

/**
 * Start the MT5 data update scheduler
 * Runs every hour to fetch and update MT5 data for all users
 */
const startMT5Scheduler = () => {
  console.log('Starting MT5 data scheduler...');
  
  // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Starting hourly MT5 data update...');
      await updateAllUsersMT5Data();
      console.log('Hourly MT5 data update completed');
    } catch (error) {
      console.error('Error in scheduled MT5 data update:', error);
    }
  }, {
    timezone: "UTC" // Use UTC timezone as per user preference
  });
  
  console.log('MT5 data scheduler started - updating every hour at minute 0');
};

/**
 * Update MT5 data for all users with active credentials
 */
const updateAllUsersMT5Data = async () => {
  try {
    // Find all users with MT5 credentials
    const users = await User.find({
      'mt5Credentials.account_id': { $exists: true, $ne: null },
      'mt5Credentials.password': { $exists: true, $ne: null },
      'mt5Credentials.server': { $exists: true, $ne: null }
    }).select('_id username firstName lastName avatar mt5Credentials');

    if (users.length === 0) {
      console.log('No users with MT5 credentials found');
      return;
    }

    console.log(`Found ${users.length} users with MT5 credentials`);

    // Process all users
    const results = await processAllUsersMT5Data(users);
    
    // Log summary
    console.log(`MT5 update summary: ${results.successful}/${results.total} users updated successfully`);
    
    if (results.failed > 0) {
      console.log(`Failed to update ${results.failed} users`);
    }
    
  } catch (error) {
    console.error('Error in updateAllUsersMT5Data:', error);
    throw error;
  }
};

/**
 * Manually trigger MT5 data update (for testing or manual runs)
 */
const triggerManualUpdate = async () => {
  console.log('Manual MT5 data update triggered...');
  try {
    await updateAllUsersMT5Data();
    console.log('Manual MT5 data update completed');
  } catch (error) {
    console.error('Error in manual MT5 data update:', error);
    throw error;
  }
};

module.exports = {
  startMT5Scheduler,
  updateAllUsersMT5Data,
  triggerManualUpdate
};
