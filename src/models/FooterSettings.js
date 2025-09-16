const mongoose = require('mongoose');

const FooterSettingsSchema = new mongoose.Schema({
  // Company Information
  companyName: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  companyDescription: {
    type: String,
    required: [true, 'Please add a company description'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Please add an email address'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  address: {
    type: String,
    required: [true, 'Please add an address'],
    trim: true,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  
  // Social Media Links
  socialMedia: {
    facebook: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/.+/.test(v);
        },
        message: 'Please add a valid URL or leave empty'
      }
    },
    twitter: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/.+/.test(v);
        },
        message: 'Please add a valid URL or leave empty'
      }
    },
    instagram: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/.+/.test(v);
        },
        message: 'Please add a valid URL or leave empty'
      }
    },
    linkedin: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/.+/.test(v);
        },
        message: 'Please add a valid URL or leave empty'
      }
    },
    youtube: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/.+/.test(v);
        },
        message: 'Please add a valid URL or leave empty'
      }
    }
  },
  
  // Newsletter Settings
  newsletter: {
    title: {
      type: String,
      required: [true, 'Please add a newsletter title'],
      trim: true,
      maxlength: [100, 'Newsletter title cannot be more than 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Please add a newsletter description'],
      trim: true,
      maxlength: [300, 'Newsletter description cannot be more than 300 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  // Legal Links
  legalLinks: {
    privacyPolicy: {
      type: String,
      required: [true, 'Please add a privacy policy URL'],
      match: [
        /^(https?:\/\/.+|\/.*)/,
        'Please add a valid URL or relative path'
      ]
    },
    termsOfService: {
      type: String,
      required: [true, 'Please add a terms of service URL'],
      match: [
        /^(https?:\/\/.+|\/.*)/,
        'Please add a valid URL or relative path'
      ]
    },
    cookiePolicy: {
      type: String,
      required: [true, 'Please add a cookie policy URL'],
      match: [
        /^(https?:\/\/.+|\/.*)/,
        'Please add a valid URL or relative path'
      ]
    }
  },
  
  // Settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update `updatedAt` on save
FooterSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one footer settings document exists
FooterSettingsSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('FooterSettings', FooterSettingsSchema);
