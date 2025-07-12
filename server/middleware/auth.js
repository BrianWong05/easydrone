const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

// 驗證JWT令牌
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth check - Headers:', req.headers['authorization']);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: '未提供訪問令牌'
      });
    }

    // 驗證令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 檢查用戶是否仍然存在
    const users = await query(
      'SELECT admin_id, username, email FROM admins WHERE admin_id = ?',
      [decoded.adminId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 將用戶信息添加到請求對象
    req.user = {
      adminId: decoded.adminId,
      username: users[0].username,
      email: users[0].email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: '無效的訪問令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: '訪問令牌已過期'
      });
    } else {
      console.error('認證錯誤:', error);
      return res.status(500).json({
        success: false,
        message: '認證過程中發生錯誤'
      });
    }
  }
};

// 生成JWT令牌
const generateToken = (adminId, username) => {
  return jwt.sign(
    { 
      adminId, 
      username,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { 
      expiresIn: '24h' // 24小時過期
    }
  );
};

// 驗證令牌但不要求必須存在（可選認證）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = await query(
        'SELECT admin_id, username, email FROM admins WHERE admin_id = ?',
        [decoded.adminId]
      );

      if (users.length > 0) {
        req.user = {
          adminId: decoded.adminId,
          username: users[0].username,
          email: users[0].email
        };
      }
    }

    next();
  } catch (error) {
    // 可選認證失敗時不返回錯誤，繼續處理請求
    next();
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  optionalAuth
};