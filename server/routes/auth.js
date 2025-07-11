const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登入驗證模式
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.empty': '用戶名不能為空',
    'string.min': '用戶名至少需要3個字符',
    'string.max': '用戶名不能超過50個字符',
    'any.required': '用戶名是必填項'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': '密碼不能為空',
    'string.min': '密碼至少需要6個字符',
    'any.required': '密碼是必填項'
  })
});

// 註冊驗證模式
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required().messages({
    'string.email': '請輸入有效的電子郵件地址'
  })
});

// 用戶登入
router.post('/login', async (req, res) => {
  try {
    // 驗證輸入數據
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    // 查找用戶
    const users = await query(
      'SELECT admin_id, username, password, email FROM admins WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    const user = users[0];

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    // 生成JWT令牌
    const token = generateToken(user.admin_id, user.username);

    res.json({
      success: true,
      message: '登入成功',
      data: {
        token,
        user: {
          adminId: user.admin_id,
          username: user.username,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登入過程中發生錯誤'
    });
  }
});

// 用戶註冊
router.post('/register', async (req, res) => {
  try {
    // 驗證輸入數據
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password, email } = value;

    // 檢查用戶名是否已存在
    const existingUsers = await query(
      'SELECT admin_id FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: '用戶名或電子郵件已存在'
      });
    }

    // 加密密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 創建新用戶
    const result = await query(
      'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );

    // 生成JWT令牌
    const token = generateToken(result.insertId, username);

    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        token,
        user: {
          adminId: result.insertId,
          username,
          email
        }
      }
    });

  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '註冊過程中發生錯誤'
    });
  }
});

// 驗證令牌
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: '令牌有效',
    data: {
      user: req.user
    }
  });
});

// 用戶登出（客戶端處理，服務端記錄）
router.post('/logout', authenticateToken, (req, res) => {
  // 在實際應用中，可以將令牌加入黑名單
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 獲取當前用戶信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT admin_id, username, email, created_at FROM admins WHERE admin_id = ?',
      [req.user.adminId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });

  } catch (error) {
    console.error('獲取用戶信息錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶信息失敗'
    });
  }
});

module.exports = router;