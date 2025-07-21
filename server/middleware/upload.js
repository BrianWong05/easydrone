const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Lazy load multer to avoid startup issues
let multer;
let upload;

const initializeMulter = () => {
  if (!multer) {
    try {
      multer = require('multer');
      
      // Configure multer for avatar uploads
      const storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, avatarsDir);
        },
        filename: function (req, file, cb) {
          // Generate unique filename: athlete_id_timestamp.ext
          const athleteId = req.params.id || req.body.athlete_id || 'new';
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          cb(null, `athlete_${athleteId}_${timestamp}${ext}`);
        }
      });

      // File filter for images only
      const fileFilter = (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只允許上傳圖片文件 (JPEG, PNG, GIF, WebP)'), false);
        }
      };

      // Configure upload limits
      upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
          files: 1 // Only one file at a time
        }
      });
    } catch (error) {
      console.error('❌ Multer initialization failed:', error.message);
      throw error;
    }
  }
  return upload;
};

// Middleware for single avatar upload
const uploadAvatar = (req, res, next) => {
  try {
    const upload = initializeMulter();
    return upload.single('avatar')(req, res, next);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '文件上傳服務暫時不可用'
    });
  }
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (!multer) {
    return res.status(500).json({
      success: false,
      message: '文件上傳服務未初始化'
    });
  }

  const MulterError = multer.MulterError;
  
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小不能超過 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '一次只能上傳一個文件'
      });
    }
  }
  
  if (error.message.includes('只允許上傳圖片文件')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  return res.status(500).json({
    success: false,
    message: '文件上傳失敗'
  });
};

// Check if multer is available
const isMulterAvailable = () => {
  try {
    require.resolve('multer');
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  uploadAvatar,
  handleUploadError,
  avatarsDir,
  isMulterAvailable
};