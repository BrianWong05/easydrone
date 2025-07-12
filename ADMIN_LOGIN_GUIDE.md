# 🔐 Admin Login System Guide

## 系統概述
您的無人機足球管理系統已經完整實現了管理員登入保護機制，所有管理功能都需要通過身份驗證才能訪問。

## 🚀 系統架構

### Docker 容器配置
- **Frontend (Admin)**: `http://localhost:3000` - 管理員界面
- **Backend API**: `http://localhost:8001` - 後端API服務
- **Database**: `localhost:3306` - MySQL數據庫
- **Public Client**: `http://localhost:3001` - 公開客戶端（無需登入）
- **Nginx Proxy**: `http://localhost:8888` - 反向代理

### 認證流程
1. 用戶訪問管理系統任何頁面
2. `ProtectedRoute` 組件檢查認證狀態
3. 未登入用戶自動重定向到 `/login` 頁面
4. 登入成功後獲得 JWT Token
5. Token 存儲在瀏覽器並用於後續API請求

## 🔑 默認管理員帳號

```
用戶名: admin
密碼: admin123
郵箱: admin@dronesoccer.com
```

## 🛡️ 安全特性

### 前端保護
- **ProtectedRoute**: 包裝所有管理頁面
- **自動重定向**: 未登入用戶重定向到登入頁
- **Token 驗證**: 頁面載入時自動驗證Token有效性
- **狀態管理**: 使用 Zustand 管理認證狀態

### 後端保護
- **JWT Token**: 24小時有效期
- **密碼加密**: 使用 bcryptjs 加密存儲
- **中間件保護**: `authenticateToken` 保護敏感API
- **錯誤處理**: 401/403 錯誤自動登出

### API 端點
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/register` - 用戶註冊
- `GET /api/auth/verify` - 驗證Token
- `POST /api/auth/logout` - 用戶登出
- `GET /api/auth/profile` - 獲取用戶資料

## 🚀 啟動系統

### 使用 Docker Compose
```bash
# 啟動所有服務
docker-compose -f docker-compose-react.yml up -d

# 查看服務狀態
docker-compose -f docker-compose-react.yml ps

# 停止服務
docker-compose -f docker-compose-react.yml down
```

### 訪問系統
1. 打開瀏覽器訪問: `http://localhost:3000`
2. 系統會自動重定向到登入頁面
3. 使用默認帳號登入: `admin` / `admin123`
4. 登入成功後進入管理系統

## 🔧 自定義配置

### 修改JWT密鑰
在 `docker-compose-react.yml` 中修改:
```yaml
environment:
  JWT_SECRET: your-new-secret-key-here
```

### 添加新管理員
```sql
INSERT INTO admins (username, password, email) VALUES 
('newadmin', '$2a$10$hashedpassword', 'newadmin@example.com');
```

### 修改Token過期時間
在 `server/middleware/auth.js` 中修改:
```javascript
expiresIn: '24h' // 修改為所需時間
```

## 🛠️ 故障排除

### 登入失敗
1. 檢查數據庫連接
2. 確認管理員帳號存在
3. 檢查密碼哈希是否正確

### Token 驗證失敗
1. 檢查JWT_SECRET配置
2. 確認Token未過期
3. 檢查網絡連接

### 容器啟動問題
```bash
# 查看容器日誌
docker-compose -f docker-compose-react.yml logs backend
docker-compose -f docker-compose-react.yml logs frontend
docker-compose -f docker-compose-react.yml logs db
```

## 📝 重要提醒

1. **生產環境**: 請務必修改默認密碼和JWT密鑰
2. **HTTPS**: 生產環境建議使用HTTPS
3. **備份**: 定期備份數據庫
4. **監控**: 監控登入失敗次數，防止暴力破解

## ✅ 系統測試

登入系統已通過測試：
- ✅ Docker 容器正常運行
- ✅ 數據庫連接正常
- ✅ 管理員帳號創建成功
- ✅ 登入API正常工作
- ✅ JWT Token 生成正常
- ✅ 前端保護機制正常

您的管理系統現在已經完全受到登入保護！🎉