const mongoose = require('mongoose');
const migrateAverageReturn = require('./src/utils/migrateAverageReturn');

// Load environment variables
require('dotenv').config();

const runMigration = async () => {
  try {
    console.log('🚀 Starting Average Return to Fee Coverage migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ctg-trading', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Run the migration
    await migrateAverageReturn();
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the migration
runMigration();
