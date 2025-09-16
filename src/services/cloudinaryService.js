const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_URL.split('@')[1],
  api_key: process.env.CLOUDINARY_URL.split('//')[1].split(':')[0],
  api_secret: process.env.CLOUDINARY_URL.split(':')[2].split('@')[0]
});

// Create storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ctg-trading',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'ico', 'svg'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Create multer upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|ico|svg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Upload single file
const uploadSingle = upload.single('image');

// Upload multiple files
const uploadMultiple = upload.array('images', 5);

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

// Get image URL with transformations
const getImageUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, transformations);
};

module.exports = {
  cloudinary,
  uploadSingle,
  uploadMultiple,
  deleteImage,
  getImageUrl
};
