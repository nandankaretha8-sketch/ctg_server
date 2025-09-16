const mongoose = require('mongoose');
const PropFirmPackage = require('../models/PropFirmPackage');

const migrateAverageReturn = async () => {
  try {
    console.log('🔄 Starting migration: Replace averageReturn with coversAllPhaseFees...');
    
    // Update all packages to replace averageReturn with coversAllPhaseFees
    const result = await PropFirmPackage.updateMany(
      {}, // Update all documents
      {
        $unset: { averageReturn: 1 }, // Remove averageReturn field
        $set: { coversAllPhaseFees: false } // Add coversAllPhaseFees field with default value
      }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} packages`);
    console.log(`📝 Removed averageReturn field and added coversAllPhaseFees field`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

module.exports = migrateAverageReturn;
