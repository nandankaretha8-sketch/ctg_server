const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  logo: {
    type: String,
    default: null
  },
  favicon: {
    type: String,
    default: null
  },
  mentorPhoto: {
    type: String,
    default: null
  },
  siteName: {
    type: String,
    default: 'CTG Trading'
  },
  siteDescription: {
    type: String,
    default: 'Professional Trading Challenge Platform'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
