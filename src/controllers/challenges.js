const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

// Helper function to update user's trading stats
const updateUserTradingStats = async (userId) => {
  try {
    // Get user's challenges
    const challenges = await Challenge.find({
      'participants.user': userId,
    });

    const userParticipations = challenges.map(challenge => {
      const participation = challenge.participants.find(
        p => p.user.toString() === userId.toString()
      );
      return {
        status: participation.status,
        profit: participation.profit || 0,
      };
    });

    // Calculate stats
    const totalChallenges = userParticipations.length;
    const completedChallenges = userParticipations.filter(p => p.status === 'completed').length;
    const totalProfit = userParticipations.reduce((sum, p) => sum + p.profit, 0);
    const winRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;

    // Update user's trading stats
    await User.findByIdAndUpdate(userId, {
      'tradingStats.totalChallenges': totalChallenges,
      'tradingStats.completedChallenges': completedChallenges,
      'tradingStats.totalProfit': totalProfit,
      'tradingStats.winRate': Math.round(winRate * 100) / 100, // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error updating user trading stats:', error);
  }
};

// Helper function to update leaderboard entry
const updateLeaderboardEntry = async (userId, participantData) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Find or create leaderboard entry
    let leaderboardEntry = await Leaderboard.findOne({ userId: userId });
    
    if (!leaderboardEntry) {
      // Create new leaderboard entry
      leaderboardEntry = new Leaderboard({
        userId: userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar || '',
        accountId: participantData.mt5Account?.id || 'N/A',
        balance: participantData.currentBalance || 0,
        equity: participantData.currentBalance || 0,
        profit: participantData.profit || 0,
        profitPercent: participantData.profitPercent || 0,
        margin: 0,
        freeMargin: participantData.currentBalance || 0,
        marginLevel: 0,
        positions: [],
      });
    } else {
      // Update existing leaderboard entry
      leaderboardEntry.username = user.username;
      leaderboardEntry.firstName = user.firstName;
      leaderboardEntry.lastName = user.lastName;
      leaderboardEntry.avatar = user.avatar || '';
      leaderboardEntry.accountId = participantData.mt5Account?.id || leaderboardEntry.accountId;
      leaderboardEntry.balance = participantData.currentBalance || leaderboardEntry.balance;
      leaderboardEntry.equity = participantData.currentBalance || leaderboardEntry.equity;
      leaderboardEntry.profit = participantData.profit || leaderboardEntry.profit;
      leaderboardEntry.profitPercent = participantData.profitPercent || leaderboardEntry.profitPercent;
      leaderboardEntry.freeMargin = participantData.currentBalance || leaderboardEntry.freeMargin;
    }

    await leaderboardEntry.save();
  } catch (error) {
    console.error('Error updating leaderboard entry:', error);
  }
};

// Helper function to sync all participants to leaderboard
const syncAllParticipantsToLeaderboard = async (req, res) => {
  try {
    console.log('Starting leaderboard sync...');
    
    // Get all challenges with participants
    const challenges = await Challenge.find({
      'participants.0': { $exists: true }
    }).populate('participants.user', 'username firstName lastName avatar');

    let syncedCount = 0;
    
    for (const challenge of challenges) {
      for (const participant of challenge.participants) {
        if (participant.user) {
          await updateLeaderboardEntry(participant.user._id, participant);
          syncedCount++;
        }
      }
    }
    
    console.log(`Leaderboard sync completed. Synced ${syncedCount} participants.`);
    
    res.json({
      success: true,
      message: `Leaderboard sync completed successfully. Synced ${syncedCount} participants.`,
      syncedCount: syncedCount
    });
  } catch (error) {
    console.error('Error syncing participants to leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing participants to leaderboard',
      error: error.message
    });
  }
};

// Get all challenges for users (active and upcoming)
const getAllChallenges = async (req, res) => {
  try {
    const { type, status = 'active' } = req.query;
    
    // Handle multiple statuses (e.g., "active,upcoming")
    let statusFilter;
    if (status.includes(',')) {
      const statuses = status.split(',').map(s => s.trim());
      statusFilter = { $in: statuses };
    } else {
      statusFilter = status;
    }
    
    const filter = { status: statusFilter };
    if (type) {
      filter.type = type;
    }
    
    const challenges = await Challenge.find(filter)
      .populate('createdBy', 'name email')
      .populate('participants.user', 'firstName lastName username email')
      .sort({ createdAt: -1 })
    
    
    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges',
      error: error.message
    });
  }
};

// Get single challenge by ID
const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const challenge = await Challenge.findById(id)
      .populate('createdBy', 'name email')
      .select('-participants.mt5Account'); // Don't expose MT5 credentials
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    res.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge',
      error: error.message
    });
  }
};

// Create new challenge (Admin only)
const createChallenge = async (req, res) => {
  try {
    // console.log('Creating challenge with data:', req.body);
    
    const {
      name,
      type,
      accountSize,
      price,
      prizes,
      maxParticipants,
      startDate,
      endDate,
      description,
      rules,
      requirements,
      status,
      challengeMode
    } = req.body;
    
    // Validate required fields
    if (!name || !type || !accountSize || !startDate || !endDate || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate dates - parse as UTC dates for consistency
    // startDate and endDate now come as full datetime strings from frontend
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    // Validate that start datetime is not in the past (using UTC)
    const now = new Date();
    
    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: 'Start date and time cannot be in the past'
      });
    }
    
    
    const challenge = new Challenge({
      name,
      type,
      accountSize,
      price: price || 0,
      prizes: prizes || [],
      maxParticipants: maxParticipants || 100,
      startDate: start,
      endDate: end,
      description,
      rules: rules || [],
      requirements: requirements || {},
      status: status || 'draft',
      challengeMode: challengeMode || 'target',
      createdBy: req.user.id
    });
    
    await challenge.save();
    
    res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create challenge',
      error: error.message
    });
  }
};

// Update challenge (Admin only)
const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.participants;
    delete updateData.currentParticipants;
    
    const challenge = await Challenge.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Challenge updated successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update challenge',
      error: error.message
    });
  }
};

// Delete challenge (Admin only)
const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    
    const challenge = await Challenge.findById(id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if challenge has participants
    if (challenge.currentParticipants > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete challenge with participants'
      });
    }
    
    await Challenge.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete challenge',
      error: error.message
    });
  }
};

// Join challenge
const joinChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { mt5Account } = req.body;
    
    const challenge = await Challenge.findById(id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Allow joining both active and upcoming challenges
    if (challenge.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This challenge has already ended'
      });
    }
    
    if (challenge.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This challenge has been cancelled'
      });
    }
    
    if (challenge.currentParticipants >= challenge.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Challenge is full'
      });
    }
    
    // Check if user is already a participant
    const existingParticipant = challenge.participants.find(
      p => p.user.toString() === req.user.id.toString()
    );
    
    if (existingParticipant) {
      // If user has pending_setup status, allow them to complete MT5 setup
      if (existingParticipant.status === 'pending_setup') {
        // Validate MT5 account information
        if (!mt5Account || !mt5Account.id || !mt5Account.password || !mt5Account.server) {
          return res.status(400).json({
            success: false,
            message: 'MT5 account information is required'
          });
        }
        
        // Update the existing participant with MT5 account details
        existingParticipant.mt5Account = {
          id: mt5Account.id,
          password: mt5Account.password,
          server: mt5Account.server
        };
        existingParticipant.status = 'active';
        existingParticipant.joinedAt = new Date();
        
        await challenge.save();
        
        // Update user's trading stats
        await updateUserTradingStats(req.user.id);
        
        return res.json({
          success: true,
          message: 'Successfully completed MT5 setup and joined challenge',
          data: {
            challengeId: challenge._id,
            participantCount: challenge.currentParticipants
          }
        });
      } else {
        // User is already a participant with completed setup
        return res.status(400).json({
          success: false,
          message: 'You are already a participant in this challenge'
        });
      }
    }
    
    // Validate MT5 account information
    if (!mt5Account || !mt5Account.id || !mt5Account.password || !mt5Account.server) {
      return res.status(400).json({
        success: false,
        message: 'MT5 account information is required'
      });
    }
    
    // Add participant to challenge
    await challenge.addParticipant(req.user.id, mt5Account);
    
    // Get the newly added participant
    const newParticipant = challenge.participants.find(p => p.user.toString() === req.user.id.toString());
    
    // Update user's trading stats
    await updateUserTradingStats(req.user.id);
    
    // Create leaderboard entry
    await updateLeaderboardEntry(req.user.id, newParticipant);
    
    res.json({
      success: true,
      message: 'Successfully joined challenge',
      data: {
        challengeId: challenge._id,
        participantCount: challenge.currentParticipants
      }
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join challenge',
      error: error.message
    });
  }
};

// Leave challenge
const leaveChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    
    const challenge = await Challenge.findById(id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if user is a participant
    const participant = challenge.participants.find(
      p => p.user.toString() === req.user.id.toString()
    );
    
    if (!participant) {
      return res.status(400).json({
        success: false,
        message: 'You are not a participant in this challenge'
      });
    }
    
    // Remove participant from challenge
    await challenge.removeParticipant(req.user.id);
    
    res.json({
      success: true,
      message: 'Successfully left challenge'
    });
  } catch (error) {
    console.error('Error leaving challenge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to leave challenge',
      error: error.message
    });
  }
};

// Get user's challenges
const getUserChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user.id
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    // Filter out MT5 credentials for security
    const safeChallenges = challenges.map(challenge => {
      const safeChallenge = challenge.toObject();
      safeChallenge.participants = safeChallenge.participants.map(p => {
        if (p.mt5Account) {
          p.mt5Account.password = '***'; // Hide password
        }
        return p;
      });
      return safeChallenge;
    });
    
    res.json({
      success: true,
      data: safeChallenges
    });
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user challenges',
      error: error.message
    });
  }
};

// Get admin challenges (Admin only)
const getAdminChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      createdBy: req.user.id
    })
      .populate('participants.user', 'name email')
      .sort({ createdAt: -1 });
    
    
    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error('Error fetching admin challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin challenges',
      error: error.message
    });
  }
};

// Automatically update challenge statuses based on current time
const updateChallengeStatuses = async () => {
  try {
    const now = new Date();
    
    // Find challenges that need status updates
    const challenges = await Challenge.find({
      status: { $in: ['upcoming', 'active'] }
    });
    
    const updatePromises = [];
    
    for (const challenge of challenges) {
      const startDate = new Date(challenge.startDate);
      const endDate = new Date(challenge.endDate);
      let newStatus = null;
      
      if (now >= endDate) {
        // Challenge has ended
        newStatus = 'completed';
      } else if (now >= startDate && challenge.status === 'upcoming') {
        // Challenge has started
        newStatus = 'active';
      }
      
      if (newStatus && newStatus !== challenge.status) {
        updatePromises.push(
          Challenge.findByIdAndUpdate(
            challenge._id,
            { status: newStatus },
            { new: true }
          )
        );
        
        console.log(`Challenge "${challenge.name}" status updated from "${challenge.status}" to "${newStatus}"`);
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Updated ${updatePromises.length} challenge statuses`);
    }
    
    return { success: true, updated: updatePromises.length };
  } catch (error) {
    console.error('Error updating challenge statuses:', error);
    return { success: false, error: error.message };
  }
};

// Manual endpoint to trigger status updates (for testing)
const triggerStatusUpdate = async (req, res) => {
  try {
    const result = await updateChallengeStatuses();
    
    res.json({
      success: true,
      message: 'Challenge statuses updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error triggering status update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update challenge statuses',
      error: error.message
    });
  }
};

// Get user's MT5 account for a specific challenge
const getUserMT5Account = async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    const userId = req.user.id;
    
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Find the user's participation in this challenge
    const participant = challenge.participants.find(
      p => p.user.toString() === userId
    );
    
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'You are not participating in this challenge'
      });
    }
    
    if (!participant.mt5Account) {
      return res.status(404).json({
        success: false,
        message: 'MT5 account not found for this challenge'
      });
    }
    
    res.json({
      success: true,
      account: {
        id: participant._id,
        accountId: participant.mt5Account.id,
        server: participant.mt5Account.server,
        password: participant.mt5Account.password,
        challengeId: challenge._id,
        challengeName: challenge.name,
        joinedAt: participant.joinedAt,
        status: participant.status
      }
    });
  } catch (error) {
    console.error('Error fetching user MT5 account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MT5 account',
      error: error.message
    });
  }
};

// Get all MT5 accounts (Admin only)
const getAllMT5Accounts = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.0': { $exists: true }
    })
      .populate('participants.user', 'name email')
      .select('name participants')
      .sort({ createdAt: -1 });
    
    // Extract MT5 accounts from all challenges
    const mt5Accounts = [];
    challenges.forEach(challenge => {
      challenge.participants.forEach(participant => {
        if (participant.mt5Account) {
          mt5Accounts.push({
            _id: participant._id,
            challengeId: challenge._id,
            challengeName: challenge.name,
            userId: participant.user._id,
            userName: participant.user.name,
            userEmail: participant.user.email,
            mt5Account: {
              id: participant.mt5Account.id,
              server: participant.mt5Account.server,
              // Show actual password to admin
              password: participant.mt5Account.password
            },
            joinedAt: participant.joinedAt,
            status: participant.status
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: mt5Accounts
    });
  } catch (error) {
    console.error('Error fetching MT5 accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MT5 accounts',
      error: error.message
    });
  }
};

module.exports = {
  getAllChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  getUserChallenges,
  getAdminChallenges,
  getUserMT5Account,
  getAllMT5Accounts,
  updateChallengeStatuses,
  triggerStatusUpdate
};

// Update participant data (admin only)
const updateParticipant = async (req, res) => {
  try {
    const { challengeId, participantId } = req.params;
    const { currentBalance, profit, status } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const participant = challenge.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Update participant data
    if (currentBalance !== undefined) participant.currentBalance = currentBalance;
    if (profit !== undefined) participant.profit = profit;
    if (status !== undefined) participant.status = status;
    if (req.body.mt5Account !== undefined) participant.mt5Account = req.body.mt5Account;
    if (req.body.profitPercent !== undefined) participant.profitPercent = req.body.profitPercent;
    
    // Auto-calculate profit percentage if not provided or if profit/balance changed
    if (req.body.profitPercent === undefined || profit !== undefined || currentBalance !== undefined) {
      const balance = participant.currentBalance || challenge.accountSize;
      const profitAmount = participant.profit || 0;
      participant.profitPercent = balance > 0 ? (profitAmount / balance) * 100 : 0;
    }

    await challenge.save();

    // Update user's trading stats
    await updateUserTradingStats(participant.user);
    
    // Update leaderboard entry
    await updateLeaderboardEntry(participant.user, participant);

    res.json({
      success: true,
      message: 'Participant updated successfully',
      participant: participant
    });
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating participant',
      error: error.message
    });
  }
};

// Get participants for a specific challenge (admin only)
const getChallengeParticipants = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId)
      .populate('participants.user', 'firstName lastName username email')
      .select('name participants');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      participants: challenge.participants,
      challengeName: challenge.name
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching participants',
      error: error.message
    });
  }
};

module.exports = {
  getAllChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  getUserChallenges,
  getAdminChallenges,
  getUserMT5Account,
  getAllMT5Accounts,
  updateChallengeStatuses,
  triggerStatusUpdate,
  updateParticipant,
  getChallengeParticipants,
  syncAllParticipantsToLeaderboard
};