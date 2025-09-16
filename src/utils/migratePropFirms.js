const PropFirmPackage = require('../models/PropFirmPackage');

const migratePropFirmsToRecommended = async () => {
  try {
    console.log('🔄 Starting migration of supportedPropFirms to recommendedPropFirms...');
    
    const packages = await PropFirmPackage.find({});
    let migratedCount = 0;
    
    for (const package of packages) {
      if (package.requirements.supportedPropFirms && package.requirements.supportedPropFirms.length > 0) {
        // Convert supportedPropFirms to recommendedPropFirms with high priority
        const recommendedFirms = package.requirements.supportedPropFirms.map(firmName => ({
          name: firmName,
          priority: 'high',
          isRecommended: true,
          description: 'Migrated from supported firms'
        }));
        
        // Update the package
        await PropFirmPackage.findByIdAndUpdate(
          package._id,
          {
            $set: {
              'requirements.recommendedPropFirms': recommendedFirms
            }
          }
        );
        
        migratedCount++;
        console.log(`✅ Migrated package: ${package.name} (${recommendedFirms.length} firms)`);
      }
    }
    
    console.log(`🎉 Migration completed! ${migratedCount} packages migrated.`);
    return { success: true, migratedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { migratePropFirmsToRecommended };
