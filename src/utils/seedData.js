const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@ctg.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      tradingStats: {
        totalChallenges: 0,
        completedChallenges: 0,
        totalProfit: 0,
        winRate: 0,
        rank: 0,
      },
    });

    // Create sample users
    const sampleUsers = await User.create([
      {
        username: 'trader1',
        email: 'trader1@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        tradingStats: {
          totalChallenges: 5,
          completedChallenges: 3,
          totalProfit: 2500,
          winRate: 60,
          rank: 1,
        },
      },
      {
        username: 'trader2',
        email: 'trader2@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        tradingStats: {
          totalChallenges: 4,
          completedChallenges: 2,
          totalProfit: 1800,
          winRate: 50,
          rank: 2,
        },
      },
      {
        username: 'trader3',
        email: 'trader3@example.com',
        password: 'password123',
        firstName: 'Mike',
        lastName: 'Johnson',
        tradingStats: {
          totalChallenges: 3,
          completedChallenges: 1,
          totalProfit: 1200,
          winRate: 33,
          rank: 3,
        },
      },
    ]);

    console.log('Users seeded successfully');
    return { adminUser, sampleUsers };
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedChallenges = async (adminUser) => {
  try {
    // Clear existing challenges
    await Challenge.deleteMany({});

    // Create sample challenges
    const now = new Date();
    const startDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Tomorrow
    const endDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // Next week
    
    const challenges = await Challenge.create([
      {
        name: 'CTG Swing Challenge',
        description: 'WIN WIN WIN - Perfect for swing traders to test their skills with a $100,000 account.',
        type: 'swing',
        accountSize: 100000,
        price: 30,
        prizes: [
          { rank: 1, prize: 'First Place', amount: 5000 },
          { rank: 2, prize: 'Second Place', amount: 2500 },
          { rank: 3, prize: 'Third Place', amount: 1000 }
        ],
        maxParticipants: 100,
        currentParticipants: 0,
        startDate: startDate,
        endDate: endDate,
        status: 'upcoming',
        description: 'WIN WIN WIN',
        rules: [
          'No overnight positions allowed',
          'Maximum 5 trades per day',
          'Stop loss must be set for every trade',
          'No news trading',
        ],
        requirements: {
          minBalance: 0,
          maxDrawdown: 10,
          targetProfit: 10
        },
        createdBy: adminUser._id,
        participants: [],
      },
      {
        name: 'Scalping Master Challenge',
        description: 'Test your scalping skills with quick trades and tight spreads.',
        type: 'scalp',
        accountSize: 50000,
        price: 0,
        prizes: [
          { rank: 1, prize: 'Scalping Champion', amount: 2000 },
          { rank: 2, prize: 'Runner Up', amount: 1000 }
        ],
        maxParticipants: 50,
        currentParticipants: 0,
        startDate: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)), // Started 2 days ago
        endDate: new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)), // Ends in 5 days
        status: 'active',
        description: 'Fast-paced scalping challenge for experienced traders',
        rules: [
          'Maximum 20 trades per day',
          'Minimum 5 pips per trade',
          'No holding positions overnight',
          'Risk management is mandatory',
        ],
        requirements: {
          minBalance: 0,
          maxDrawdown: 5,
          targetProfit: 15
        },
        createdBy: adminUser._id,
        participants: [],
      },
      {
        name: 'Day Trading Pro Challenge',
        description: 'The ultimate day trading challenge for professionals.',
        type: 'day-trading',
        accountSize: 200000,
        price: 100,
        prizes: [
          { rank: 1, prize: 'Day Trading Pro', amount: 10000 },
          { rank: 2, prize: 'Second Place', amount: 5000 },
          { rank: 3, prize: 'Third Place', amount: 2500 }
        ],
        maxParticipants: 25,
        currentParticipants: 0,
        startDate: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)), // Started 10 days ago
        endDate: new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)), // Ended 3 days ago
        status: 'completed',
        description: 'Professional day trading challenge with high stakes',
        rules: [
          'Advanced risk management required',
          'Daily performance reports',
          'No algorithmic trading',
          'Mentorship program included',
        ],
        requirements: {
          minBalance: 0,
          maxDrawdown: 8,
          targetProfit: 20
        },
        createdBy: adminUser._id,
        participants: [],
      },
    ]);

    console.log('Challenges seeded successfully');
    return challenges;
  } catch (error) {
    console.error('Error seeding challenges:', error);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('Starting database seeding...');
    
    const { adminUser, sampleUsers } = await seedUsers();
    const challenges = await seedChallenges(adminUser);
    
    console.log('Database seeded successfully!');
    console.log('Admin user created: admin@ctg.com / admin123');
    console.log('Sample users created with trading stats');
    console.log('Sample challenges created');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedChallenges };
