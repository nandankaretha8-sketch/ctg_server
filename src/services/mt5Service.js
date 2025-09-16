const axios = require('axios');

// MT5 Python service URL
const MT5_SERVICE_URL = process.env.MT5_SERVICE_URL || 'http://localhost:8000';

/**
 * Fetch MT5 account data from Python service
 * @param {Object} credentials - MT5 credentials {account_id, password, server}
 * @returns {Object} Account data from MT5
 */
const fetchMT5AccountData = async (credentials) => {
  try {
    const response = await axios.post(`${MT5_SERVICE_URL}/fetch-account`, {
      account_id: credentials.account_id,
      password: credentials.password,
      server: credentials.server
    }, {
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching MT5 data:', error.message);
    
    if (error.response) {
      // Python service returned an error
      throw new Error(`MT5 Service Error: ${error.response.data.detail || error.response.data.message}`);
    } else if (error.request) {
      // Network error
      throw new Error('MT5 Service Unavailable: Could not connect to Python service');
    } else {
      // Other error
      throw new Error(`MT5 Service Error: ${error.message}`);
    }
  }
};

/**
 * Update leaderboard collection with MT5 data
 * @param {Object} user - User document from MongoDB
 * @param {Object} mt5Data - Data from MT5 service
 */
const updateLeaderboardWithMT5Data = async (user, mt5Data) => {
  try {
    // Assuming there's a Leaderboard model/collection
    // Update or create leaderboard entry for this user
    // Calculate profit percentage if not provided
    const profitPercent = mt5Data.profit_percent !== undefined 
      ? mt5Data.profit_percent 
      : mt5Data.balance > 0 
        ? ((mt5Data.equity - mt5Data.balance) / mt5Data.balance) * 100 
        : 0;

    const leaderboardData = {
      userId: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      accountId: mt5Data.account_id,
      balance: mt5Data.balance,
      equity: mt5Data.equity,
      profit: mt5Data.profit,
      margin: mt5Data.margin,
      freeMargin: mt5Data.free_margin,
      marginLevel: mt5Data.margin_level,
      profitPercent: profitPercent,
      positions: mt5Data.positions,
      updatedAt: new Date()
    };

    // Use upsert to create or update
    const Leaderboard = require('../models/Leaderboard');
    await Leaderboard.findOneAndUpdate(
      { userId: user._id },
      leaderboardData,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`Updated leaderboard for user ${user.username} (${user._id})`);
    return true;
  } catch (error) {
    console.error(`Error updating leaderboard for user ${user._id}:`, error.message);
    return false;
  }
};

/**
 * Process a single user's MT5 data
 * @param {Object} user - User document with MT5 credentials
 */
const processUserMT5Data = async (user) => {
  try {
    // Check if user has MT5 credentials
    if (!user.mt5Credentials || !user.mt5Credentials.account_id || !user.mt5Credentials.password || !user.mt5Credentials.server) {
      console.log(`User ${user.username} has no MT5 credentials, skipping...`);
      return false;
    }

    // Fetch MT5 data
    const mt5Data = await fetchMT5AccountData(user.mt5Credentials);
    
    // Update leaderboard
    await updateLeaderboardWithMT5Data(user, mt5Data);
    
    return true;
  } catch (error) {
    console.error(`Error processing MT5 data for user ${user.username}:`, error.message);
    return false;
  }
};

/**
 * Process all users with MT5 credentials
 * @param {Array} users - Array of user documents
 */
const processAllUsersMT5Data = async (users) => {
  console.log(`Processing MT5 data for ${users.length} users...`);
  
  const results = await Promise.allSettled(
    users.map(user => processUserMT5Data(user))
  );

  const successful = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
  const failed = results.length - successful;

  console.log(`MT5 data processing completed: ${successful} successful, ${failed} failed`);
  
  return { successful, failed, total: results.length };
};

module.exports = {
  fetchMT5AccountData,
  updateLeaderboardWithMT5Data,
  processUserMT5Data,
  processAllUsersMT5Data
};
