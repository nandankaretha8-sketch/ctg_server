const mongoose = require('mongoose');
const PropFirmPackage = require('../models/PropFirmPackage');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ctg-trading-platform');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migrate fee structure
const migrateFees = async () => {
  try {
    console.log('Starting fee migration...');
    
    // Find all packages that still have the old fee structure
    const packages = await PropFirmPackage.find({
      $or: [
        { price: { $exists: true } },
        { setupFee: { $exists: true } },
        { performanceFee: { $exists: true } }
      ]
    });
    
    console.log(`Found ${packages.length} packages to migrate`);
    
    for (const pkg of packages) {
      console.log(`Migrating package: ${pkg.name}`);
      
      // Calculate service fee from existing fees
      let serviceFee = 0;
      
      if (pkg.price) {
        serviceFee += pkg.price;
      }
      
      if (pkg.setupFee) {
        serviceFee += pkg.setupFee;
      }
      
      // For performance fee, we'll add it to service fee if it's a fixed amount
      // If it's a percentage, we'll set it to 0 for now
      if (pkg.performanceFee && typeof pkg.performanceFee === 'number' && pkg.performanceFee <= 100) {
        // It's a percentage, skip it
        console.log(`  Skipping performance fee (percentage): ${pkg.performanceFee}%`);
      } else if (pkg.performanceFee) {
        serviceFee += pkg.performanceFee;
      }
      
      // Update the package
      await PropFirmPackage.findByIdAndUpdate(pkg._id, {
        $set: {
          serviceFee: serviceFee
        },
        $unset: {
          price: 1,
          setupFee: 1,
          performanceFee: 1
        }
      });
      
      console.log(`  Updated service fee to: $${serviceFee}`);
    }
    
    console.log('Fee migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateFees();
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateFees };
