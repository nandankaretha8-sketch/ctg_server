const { updateChallengeStatuses } = require('../controllers/challenges');

// Schedule challenge status updates
const startChallengeStatusScheduler = () => {
  console.log('Starting challenge status scheduler...');
  
  // Run immediately on startup
  updateChallengeStatuses();
  
  // Then run every minute to check for status updates
  setInterval(async () => {
    try {
      await updateChallengeStatuses();
    } catch (error) {
      console.error('Error in scheduled challenge status update:', error);
    }
  }, 60000); // Run every 60 seconds (1 minute)
  
  console.log('Challenge status scheduler started - checking every minute');
};

module.exports = {
  startChallengeStatusScheduler
};
