const YouTubeVideo = require('../models/YouTubeVideo');

// @desc    Get all active YouTube videos
// @route   GET /api/youtube-videos
// @access  Public
const getYouTubeVideos = async (req, res, next) => {
  try {
    const videos = await YouTubeVideo.find({ isActive: true })
      .populate('addedBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: videos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all YouTube videos (admin)
// @route   GET /api/youtube-videos/admin
// @access  Private/Admin
const getAdminYouTubeVideos = async (req, res, next) => {
  try {
    const videos = await YouTubeVideo.find()
      .populate('addedBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: videos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new YouTube video
// @route   POST /api/youtube-videos
// @access  Private/Admin
const createYouTubeVideo = async (req, res, next) => {
  try {
    const { title, url, thumbnail, description, isActive } = req.body;

    // Validate required fields
    if (!title || !url) {
      return res.status(400).json({
        success: false,
        message: 'Title and URL are required'
      });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(url)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid YouTube URL'
      });
    }

    const video = await YouTubeVideo.create({
      title,
      url,
      thumbnail: thumbnail || '',
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      addedBy: req.user.id
    });

    const populatedVideo = await YouTubeVideo.findById(video._id)
      .populate('addedBy', 'username firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedVideo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update YouTube video
// @route   PUT /api/youtube-videos/:id
// @access  Private/Admin
const updateYouTubeVideo = async (req, res, next) => {
  try {
    const { title, url, thumbnail, description, isActive } = req.body;

    const video = await YouTubeVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Validate YouTube URL if provided
    if (url) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
      if (!youtubeRegex.test(url)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid YouTube URL'
        });
      }
    }

    // Update fields
    if (title) video.title = title;
    if (url) video.url = url;
    if (thumbnail !== undefined) video.thumbnail = thumbnail;
    if (description !== undefined) video.description = description;
    if (isActive !== undefined) video.isActive = isActive;

    await video.save();

    const updatedVideo = await YouTubeVideo.findById(video._id)
      .populate('addedBy', 'username firstName lastName');

    res.status(200).json({
      success: true,
      data: updatedVideo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete YouTube video
// @route   DELETE /api/youtube-videos/:id
// @access  Private/Admin
const deleteYouTubeVideo = async (req, res, next) => {
  try {
    const video = await YouTubeVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle video active status
// @route   PATCH /api/youtube-videos/:id/toggle
// @access  Private/Admin
const toggleVideoStatus = async (req, res, next) => {
  try {
    const video = await YouTubeVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    video.isActive = !video.isActive;
    await video.save();

    const updatedVideo = await YouTubeVideo.findById(video._id)
      .populate('addedBy', 'username firstName lastName');

    res.status(200).json({
      success: true,
      data: updatedVideo
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getYouTubeVideos,
  getAdminYouTubeVideos,
  createYouTubeVideo,
  updateYouTubeVideo,
  deleteYouTubeVideo,
  toggleVideoStatus
};
