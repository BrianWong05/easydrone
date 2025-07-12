const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const groupRoutes = require('./routes/groups');
const matchRoutes = require('./routes/matches');
const athleteRoutes = require('./routes/athletes');
const tournamentRoutes = require('./routes/tournaments');
const statsRoutes = require('./routes/stats');
// Migration routes removed for clean deployment

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// 開發環境下更寬鬆的CORS設置
const isDevelopment = process.env.NODE_ENV !== 'production';

// 信任代理設置（用於nginx反向代理）
app.set('trust proxy', 1);

// 安全中間件
app.use(helmet());

// 速率限制已完全禁用
console.log('🔓 速率限制已完全禁用');

// CORS設置
const corsOptions = {
  origin: isDevelopment ? true : [  // 開發環境允許所有來源
    process.env.CLIENT_URL || "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8888",
    "http://localhost:3000",
    "http://localhost:8001",  // 添加8001端口支持
    "http://www.gocasm.org:8888",  // 添加生產域名支持
    "https://www.gocasm.org:8888", // 添加HTTPS支持
    "http://www.gocasm.org",       // 添加主域名支持
    "https://www.gocasm.org"       // 添加HTTPS主域名支持
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

console.log('🌐 CORS配置:', {
  isDevelopment,
  allowedOrigins: corsOptions.origin
});

app.use(cors(corsOptions));

// 請求日誌中間件（用於調試CORS問題）
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const method = req.method;
  const url = req.url;
  
  if (isDevelopment && (method === 'OPTIONS' || origin)) {
    console.log(`🌐 ${method} ${url} - Origin: ${origin || 'none'}`);
  }
  
  next();
});

// 設置字符編碼
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 解析JSON with UTF-8 support
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true,
  parameterLimit: 20000,
  limit: '50mb'
}));

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: '無人機足球系統API運行正常',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/stats', statsRoutes);
// Migration routes removed for clean deployment

// Socket.IO 連接處理（用於實時比賽）
io.on('connection', (socket) => {
  console.log('客戶端已連接:', socket.id);

  // 加入比賽房間
  socket.on('join-match', (matchId) => {
    socket.join(`match-${matchId}`);
    console.log(`客戶端 ${socket.id} 加入比賽房間: match-${matchId}`);
  });

  // 離開比賽房間
  socket.on('leave-match', (matchId) => {
    socket.leave(`match-${matchId}`);
    console.log(`客戶端 ${socket.id} 離開比賽房間: match-${matchId}`);
  });

  // 比賽分數更新
  socket.on('score-update', (data) => {
    socket.to(`match-${data.matchId}`).emit('score-updated', data);
  });

  // 比賽計時器更新
  socket.on('timer-update', (data) => {
    socket.to(`match-${data.matchId}`).emit('timer-updated', data);
  });

  // 比賽狀態更新
  socket.on('match-status-update', (data) => {
    socket.to(`match-${data.matchId}`).emit('match-status-updated', data);
  });

  // 犯規更新
  socket.on('foul-update', (data) => {
    socket.to(`match-${data.matchId}`).emit('foul-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('客戶端已斷開連接:', socket.id);
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('服務器錯誤:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: '服務器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : '請聯繫系統管理員'
  });
});

// 404處理
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '找不到請求的資源' 
  });
});

// 啟動服務器（等待數據庫連接）
const startServer = async () => {
  console.log(`🚁 無人機足球系統後端API運行在端口 ${PORT}`);
  console.log(`🌐 環境: ${process.env.NODE_ENV || 'development'}`);
  
  // 等待數據庫連接
  console.log('⏳ 等待數據庫連接...');
  const dbConnected = await db.testConnection();
  
  if (dbConnected) {
    console.log('📊 數據庫連接狀態: 已連接');
  } else {
    console.log('📊 數據庫連接狀態: 連接失敗，但服務器將繼續運行');
  }
  
  server.listen(PORT, () => {
    console.log(`✅ 服務器已啟動，監聽端口 ${PORT}`);
  });
};

startServer();

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信號，正在關閉服務器...');
  server.close(() => {
    console.log('服務器已關閉');
    if (db && db.end) {
      db.end();
    }
    process.exit(0);
  });
});

module.exports = { app, io };