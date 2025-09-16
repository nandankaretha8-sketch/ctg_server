const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  volume: {
    type: Number,
    required: true,
    min: 0
  },
  entry_price: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    required: true
  }
}, { _id: false });

const LeaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  equity: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    required: true
  },
  margin: {
    type: Number,
    required: true,
    min: 0
  },
  freeMargin: {
    type: Number,
    required: true,
    min: 0
  },
  marginLevel: {
    type: Number,
    required: true,
    min: 0
  },
  profitPercent: {
    type: Number,
    required: true,
    default: 0,
    index: true
  },
  positions: [PositionSchema],
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient leaderboard queries
LeaderboardSchema.index({ profitPercent: -1, updatedAt: -1 });
LeaderboardSchema.index({ userId: 1 });

// Virtual for full name
LeaderboardSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
LeaderboardSchema.set('toJSON', { virtuals: true });
LeaderboardSchema.set('toObject', { virtuals: true });

// Static method to get leaderboard sorted by profit percentage
LeaderboardSchema.statics.getLeaderboard = function(limit = 50, skip = 0) {
  return this.find()
    .sort({ profitPercent: -1, updatedAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v')
    .lean();
};

// Static method to get user's rank
LeaderboardSchema.statics.getUserRank = function(userId) {
  return this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $lookup: {
        from: 'leaderboards',
        let: { userProfitPercent: '$profitPercent' },
        pipeline: [
          {
            $match: {
              $expr: { $gt: ['$profitPercent', '$$userProfitPercent'] }
            }
          },
          {
            $count: 'count'
          }
        ],
        as: 'higherRanked'
      }
    },
    {
      $project: {
        rank: {
          $add: [
            { $ifNull: [{ $arrayElemAt: ['$higherRanked.count', 0] }, 0] },
            1
          ]
        },
        profitPercent: 1,
        balance: 1,
        equity: 1,
        profit: 1,
        updatedAt: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
