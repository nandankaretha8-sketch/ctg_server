const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['swing', 'scalp', 'day-trading', 'scalping', 'position', 'other'],
    default: 'swing'
  },
  accountSize: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: function() {
      return this.price === 0;
    }
  },
  prizes: [{
    rank: {
      type: Number,
      required: false,
      min: 1
    },
    rankStart: {
      type: Number,
      required: false,
      min: 1
    },
    rankEnd: {
      type: Number,
      required: false,
      min: 1
    },
    prize: {
      type: String,
      required: false,
      default: ''
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    isBulk: {
      type: Boolean,
      default: false
    }
  }],
  maxParticipants: {
    type: Number,
    default: 100
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  challengeMode: {
    type: String,
    enum: ['target', 'rank'],
    default: 'target'
  },
  description: {
    type: String,
    required: true
  },
  rules: [{
    type: String
  }],
  requirements: {
    minBalance: {
      type: Number,
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 10
    },
    targetProfit: {
      type: Number,
      default: 10
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending_setup', 'active', 'completed', 'failed', 'withdrawn'],
      default: 'pending_setup'
    },
    mt5Account: {
      id: String,
      password: String,
      server: String
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
challengeSchema.index({ status: 1, startDate: 1 });
challengeSchema.index({ type: 1, status: 1 });
challengeSchema.index({ createdBy: 1 });

// Virtual for checking if challenge is full
challengeSchema.virtual('isFull').get(function() {
  return this.currentParticipants >= this.maxParticipants;
});

// Virtual for checking if challenge is active
challengeSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now &&
         !this.isFull;
});

// Method to add participant
challengeSchema.methods.addParticipant = function(userId, mt5Account) {
  if (this.isFull) {
    throw new Error('Challenge is full');
  }
  
  // Allow joining both active and upcoming challenges
  if (this.status !== 'active' && this.status !== 'upcoming') {
    throw new Error('Challenge is not available for joining');
  }
  
  // Check if user is already a participant
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (existingParticipant) {
    throw new Error('User is already a participant');
  }
  
  this.participants.push({
    user: userId,
    mt5Account: mt5Account,
    joinedAt: new Date(),
    status: 'active',
    currentBalance: this.accountSize, // Default to challenge account size
    profit: 0, // Start with 0 profit
    profitPercent: 0 // Start with 0% profit
  });
  
  this.currentParticipants += 1;
  
  return this.save();
};

// Method to remove participant
challengeSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.participants.findIndex(p => p.user.toString() === userId.toString());
  
  if (participantIndex === -1) {
    throw new Error('User is not a participant');
  }
  
  this.participants.splice(participantIndex, 1);
  this.currentParticipants = Math.max(0, this.currentParticipants - 1);
  
  return this.save();
};

// Method to update participant status
challengeSchema.methods.updateParticipantStatus = function(userId, status, data = {}) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!participant) {
    throw new Error('User is not a participant');
  }
  
  participant.status = status;
  
  if (data.currentBalance !== undefined) {
    participant.currentBalance = data.currentBalance;
  }
  
  if (data.profit !== undefined) {
    participant.profit = data.profit;
  }
  
  if (data.rank !== undefined) {
    participant.rank = data.rank;
  }
  
  return this.save();
};

// Method to validate prize structure
challengeSchema.methods.validatePrizes = function() {
  for (const prize of this.prizes) {
    if (prize.isBulk) {
      // For bulk prizes, rankStart and rankEnd are required
      if (!prize.rankStart || !prize.rankEnd) {
        throw new Error('Bulk prizes must have both rankStart and rankEnd');
      }
      if (prize.rankStart > prize.rankEnd) {
        throw new Error('rankStart cannot be greater than rankEnd');
      }
    } else {
      // For individual prizes, rank is required
      if (!prize.rank) {
        throw new Error('Individual prizes must have a rank');
      }
    }
  }
  return true;
};

// Method to get challenge leaderboard
challengeSchema.methods.getLeaderboard = async function(limit = 50, skip = 0) {
  const Leaderboard = require('./Leaderboard');
  const participantIds = this.participants.map(p => p.user);
  
  return await Leaderboard.find({
    userId: { $in: participantIds }
  })
  .sort({ profitPercent: -1, updatedAt: -1 })
  .limit(limit)
  .skip(skip)
  .select('-__v')
  .lean();
};

module.exports = mongoose.model('Challenge', challengeSchema);