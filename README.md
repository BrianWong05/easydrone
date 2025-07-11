# 🚁 無人機足球比賽管理系統 (React + Node.js 版本)

一個現代化的無人機足球錦標賽管理平台，採用 React + Node.js + MySQL 技術棧，提供完整的比賽管理、隊伍管理、實時比分等功能。

## 🌟 系統特色

### 核心功能
- **🏆 錦標賽管理**: 支援小組賽、淘汰賽、混合賽制
- **👥 隊伍管理**: 隊伍註冊、成員管理（1進攻手+3-5防守員結構）
- **⚽ 比賽管理**: 比賽排程、實時比分、犯規統計
- **📊 統計報表**: 小組積分榜、淘汰賽圖表、球員統計
- **🎮 實時比賽**: WebSocket 實時更新、鍵盤快捷鍵操作
- **📱 響應式設計**: 支援桌面端和移動端

### 技術特色
- **現代化前端**: React 18 + Ant Design + Socket.IO
- **強健後端**: Node.js + Express + MySQL
- **容器化部署**: Docker + Docker Compose
- **實時通訊**: WebSocket 支援實時比分更新
- **中文界面**: 完整的繁體中文用戶界面

## 🏗️ 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  React Frontend │    │ Node.js Backend │
│   (Port 8080)   │◄──►│   (Port 3000)   │◄──►│   (Port 8001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  MySQL Database │
                                               │   (Port 3306)   │
                                               └─────────────────┘
```

## 🚀 快速開始

### 前置需求
- Docker 20.0+
- Docker Compose 2.0+
- Git

### 1. 克隆專案
```bash
git clone <repository-url>
cd drone-soccer-system
```

### 2. 啟動系統
```bash
# 使用 React 版本的 docker-compose 文件
docker-compose -f docker-compose-react.yml up -d
```

### 3. 等待服務啟動
```bash
# 查看服務狀態
docker-compose -f docker-compose-react.yml ps

# 查看日誌
docker-compose -f docker-compose-react.yml logs -f
```

### 4. 訪問系統
- **主系統**: http://localhost:8080
- **前端**: http://localhost:3000 (開發模式)
- **後端API**: http://localhost:8001/api
- **數據庫**: localhost:3306

### 5. 默認登入
- **用戶名**: admin
- **密碼**: admin123

## 📁 專案結構

```
drone-soccer-system/
├── client/                 # React 前端
│   ├── public/             # 靜態文件
│   ├── src/
│   │   ├── components/     # 可重用組件
│   │   ├── pages/          # 頁面組件
│   │   ├── stores/         # Zustand 狀態管理
│   │   ├── services/       # API 服務
│   │   ├── utils/          # 工具函數
│   │   └── App.js          # 主應用組件
│   ├── Dockerfile          # 前端容器配置
│   └── package.json        # 前端依賴
├── server/                 # Node.js 後端
│   ├── config/             # 配置文件
│   ├── routes/             # API 路由
│   ├── middleware/         # 中間件
│   ├── Dockerfile          # 後端容器配置
│   ├── index.js            # 服務器入口
│   └── package.json        # 後端依賴
├── database/               # 數據庫
│   └── init.sql            # 初始化腳本
├── nginx/                  # 反向代理
│   └── nginx.conf          # Nginx 配置
├── docker-compose-react.yml # Docker 編排文件
└── README.md               # 說明文檔
```

## 🎮 使用指南

### 系統管理流程

1. **創建小組**
   - 進入「小組管理」
   - 創建比賽小組（A、B、C、D等）
   - 設定每組最大隊伍數

2. **註冊隊伍**
   - 進入「隊伍管理」
   - 創建隊伍並分配小組
   - 添加隊員（1名進攻手 + 3-5名防守員）

3. **安排比賽**
   - 進入「比賽管理」
   - 創建小組循環賽或淘汰賽
   - 設定比賽日期和時間

4. **進行比賽**
   - 點擊「進入比賽」開始實時比賽
   - 使用鍵盤快捷鍵快速操作：
     - `Q/W`: 隊伍1 得分 +/-
     - `O/P`: 隊伍2 得分 +/-
     - `A/S`: 隊伍1 犯規 +/-
     - `K/L`: 隊伍2 犯規 +/-
     - `空格`: 開始/暫停計時器

5. **查看統計**
   - 小組積分榜自動計算
   - 淘汰賽圖表可視化
   - 球員統計和排行榜

### API 端點

#### 認證
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/register` - 用戶註冊
- `GET /api/auth/verify` - 驗證令牌

#### 隊伍管理
- `GET /api/teams` - 獲取隊伍列表
- `POST /api/teams` - 創建隊伍
- `GET /api/teams/:id` - 獲取隊伍詳情
- `PUT /api/teams/:id` - 更新隊伍
- `DELETE /api/teams/:id` - 刪除隊伍

#### 比賽管理
- `GET /api/matches` - 獲取比賽列表
- `POST /api/matches` - 創建比賽
- `POST /api/matches/:id/start` - 開始比賽
- `PUT /api/matches/:id/score` - 更新比分
- `POST /api/matches/:id/end` - 結束比賽

#### 統計數據
- `GET /api/stats/overview` - 系統概覽
- `GET /api/stats/group-standings` - 小組積分榜
- `GET /api/stats/top-scorers` - 射手榜

## 🔧 開發模式

### 本地開發環境

1. **啟動數據庫**
```bash
docker-compose -f docker-compose-react.yml up -d db
```

2. **啟動後端**
```bash
cd server
npm install
npm run dev
```

3. **啟動前端**
```bash
cd client
npm install
npm start
```

### 環境變量

#### 後端 (.env)
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=drone_soccer
DB_USER=dronesoccer
DB_PASSWORD=dronesoccer123
JWT_SECRET=your-super-secret-jwt-key-here
PORT=8001
```

#### 前端 (.env)
```env
REACT_APP_API_URL=http://localhost:8001/api
```

## 🛠️ 部署指南

### 生產環境部署

1. **準備服務器**
   - 安裝 Docker 和 Docker Compose
   - 確保端口 8080、3306、8001 可用

2. **配置環境變量**
   - 修改數據庫密碼
   - 設置強密碼的 JWT_SECRET
   - 配置域名和 SSL

3. **啟動服務**
```bash
docker-compose -f docker-compose-react.yml up -d
```

4. **設置反向代理**（可選）
   - 配置 Nginx 或 Apache
   - 設置 SSL 證書
   - 配置域名解析

### 數據備份

```bash
# 備份數據庫
docker exec drone-soccer-db mysqldump -u dronesoccer -p drone_soccer > backup.sql

# 恢復數據庫
docker exec -i drone-soccer-db mysql -u dronesoccer -p drone_soccer < backup.sql
```

## 🐛 故障排除

### 常見問題

1. **數據庫連接失敗**
   - 檢查 MySQL 容器是否正常運行
   - 驗證數據庫憑證
   - 確認網絡連接

2. **前端無法訪問後端**
   - 檢查 API URL 配置
   - 驗證 CORS 設置
   - 查看瀏覽器控制台錯誤

3. **實時功能不工作**
   - 檢查 WebSocket 連接
   - 驗證 Socket.IO 配置
   - 確認防火牆設置

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose -f docker-compose-react.yml logs

# 查看特定服務日誌
docker-compose -f docker-compose-react.yml logs backend
docker-compose -f docker-compose-react.yml logs frontend
docker-compose -f docker-compose-react.yml logs db
```

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

本專案採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🙏 致謝

- [React](https://reactjs.org/) - 前端框架
- [Node.js](https://nodejs.org/) - 後端運行時
- [Ant Design](https://ant.design/) - UI 組件庫
- [Socket.IO](https://socket.io/) - 實時通訊
- [MySQL](https://www.mysql.com/) - 數據庫
- [Docker](https://www.docker.com/) - 容器化平台

---

**無人機足球比賽管理系統** - 讓無人機足球比賽管理變得簡單高效！ 🚁⚽