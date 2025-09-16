const Settings = require('../models/Settings');
const { uploadSingle, deleteImage } = require('../services/cloudinaryService');

// Get current settings
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// Update settings (without file upload)
const updateSettings = async (req, res) => {
  try {
    const { siteName, siteDescription } = req.body;
    
    const settings = await Settings.getSettings();
    
    const updateData = {};
    if (siteName !== undefined) updateData.siteName = siteName;
    if (siteDescription !== undefined) updateData.siteDescription = siteDescription;
    
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// Upload logo
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const settings = await Settings.getSettings();
    
    // Delete old logo if exists
    if (settings.logo) {
      try {
        const publicId = settings.logo.split('/').pop().split('.')[0];
        await deleteImage(`ctg-trading/${publicId}`);
      } catch (deleteError) {
        console.log('Failed to delete old logo:', deleteError.message);
      }
    }
    
    // Update settings with new logo URL
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { logo: req.file.path },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: updatedSettings.logo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
};

// Upload mentor photo
const uploadMentorPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const settings = await Settings.getSettings();
    
    // Delete old mentor photo if exists
    if (settings.mentorPhoto) {
      try {
        const publicId = settings.mentorPhoto.split('/').pop().split('.')[0];
        await deleteImage(`ctg-trading/${publicId}`);
      } catch (deleteError) {
        console.log('Failed to delete old mentor photo:', deleteError.message);
      }
    }
    
    // Update settings with new mentor photo URL
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { mentorPhoto: req.file.path },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Mentor photo uploaded successfully',
      data: {
        mentorPhoto: updatedSettings.mentorPhoto
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload mentor photo',
      error: error.message
    });
  }
};

// Upload favicon
const uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const settings = await Settings.getSettings();
    
    // Delete old favicon if exists
    if (settings.favicon) {
      try {
        const publicId = settings.favicon.split('/').pop().split('.')[0];
        await deleteImage(`ctg-trading/${publicId}`);
      } catch (deleteError) {
        console.log('Failed to delete old favicon:', deleteError.message);
      }
    }
    
    // Update settings with new favicon URL
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { favicon: req.file.path },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: {
        favicon: updatedSettings.favicon
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload favicon',
      error: error.message
    });
  }
};

// Delete logo
const deleteLogo = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.logo) {
      return res.status(400).json({
        success: false,
        message: 'No logo to delete'
      });
    }
    
    // Delete from Cloudinary
    try {
      const publicId = settings.logo.split('/').pop().split('.')[0];
      await deleteImage(`ctg-trading/${publicId}`);
    } catch (deleteError) {
      console.log('Failed to delete logo from Cloudinary:', deleteError.message);
    }
    
    // Update settings
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { logo: null },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete logo',
      error: error.message
    });
  }
};

// Delete favicon
const deleteFavicon = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.favicon) {
      return res.status(400).json({
        success: false,
        message: 'No favicon to delete'
      });
    }
    
    // Delete from Cloudinary
    try {
      const publicId = settings.favicon.split('/').pop().split('.')[0];
      await deleteImage(`ctg-trading/${publicId}`);
    } catch (deleteError) {
      console.log('Failed to delete favicon from Cloudinary:', deleteError.message);
    }
    
    // Update settings
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { favicon: null },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Favicon deleted successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete favicon',
      error: error.message
    });
  }
};

// Delete mentor photo
const deleteMentorPhoto = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.mentorPhoto) {
      return res.status(400).json({
        success: false,
        message: 'No mentor photo to delete'
      });
    }
    
    // Delete from Cloudinary
    try {
      const publicId = settings.mentorPhoto.split('/').pop().split('.')[0];
      await deleteImage(`ctg-trading/${publicId}`);
    } catch (deleteError) {
      console.log('Failed to delete mentor photo from Cloudinary:', deleteError.message);
    }
    
    // Update settings
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { mentorPhoto: null },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Mentor photo deleted successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete mentor photo',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadMentorPhoto,
  uploadFavicon,
  deleteLogo,
  deleteMentorPhoto,
  deleteFavicon
};
