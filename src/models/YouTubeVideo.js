const mongoose = require('mongoose');

const youtubeVideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a video title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  url: {
    type: String,
    required: [true, 'Please add a YouTube URL'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic YouTube URL validation
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(v);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  thumbnail: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
youtubeVideoSchema.index({ isActive: 1, createdAt: -1 });

// Method to extract video ID from URL
youtubeVideoSchema.methods.getVideoId = function() {
  const url = this.url;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Method to get YouTube thumbnail URL
youtubeVideoSchema.methods.getThumbnailUrl = function() {
  if (this.thumbnail) {
    return this.thumbnail;
  }
  
  const videoId = this.getVideoId();
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  
  return null;
};

module.exports = mongoose.model('YouTubeVideo', youtubeVideoSchema);
