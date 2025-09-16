const mongoose = require('mongoose');
const { migratePropFirmsToRecommended } = require('./src/utils/migratePropFirms');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ctg-trading', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function runMigration() {
  try {
    console.log('🚀 Starting prop firms migration...');
    const result = await migratePropFirmsToRecommended();
    
    if (result.success) {
      console.log(`✅ Migration completed successfully! ${result.migratedCount} packages migrated.`);
    } else {
      console.error('❌ Migration failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
}

runMigration();
