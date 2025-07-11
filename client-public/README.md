# 無人機足球錦標賽 - 公開客戶端

這是無人機足球比賽管理系統的公開客戶端版本，提供只讀的賽事資訊展示。

## 功能特色

- 🏆 **積分榜**: 顯示總積分榜和各小組積分榜
- 👥 **隊伍資訊**: 查看參賽隊伍列表和詳細資訊
- 🏁 **小組資訊**: 瀏覽小組分組和小組內排名
- ⚽ **比賽資訊**: 查看比賽賽程、結果和詳情
- 🏆 **淘汰賽對戰表**: 查看淘汰賽階段的對戰圖表

## 技術架構

- **前端**: React 18 + Ant Design
- **狀態管理**: React Hooks
- **路由**: React Router v6
- **HTTP客戶端**: Axios
- **容器化**: Docker

## 部署方式

### 使用 Docker Compose

```bash
# 啟動包含公開客戶端的完整系統
docker-compose -f docker-compose-react.yml up -d

# 僅啟動公開客戶端相關服務
docker-compose -f docker-compose-react.yml up -d db backend client-public
```

### 訪問地址

- **管理端**: http://localhost:3000
- **公開客戶端**: http://localhost:3001
- **API**: http://localhost:8001

## 自動錦標賽選擇

系統會自動選擇要顯示的錦標賽：

1. 優先顯示狀態為 `active` 的錦標賽
2. 如果沒有活躍錦標賽，顯示最新創建的錦標賽
3. 管理員可以通過後台設置哪個錦標賽對公眾可見

## 頁面結構

```
client-public/
├── src/
│   ├── App.js                    # 主應用組件
│   ├── components/
│   │   └── Layout/
│   │       └── ClientLayout.js   # 客戶端佈局組件
│   └── pages/
│       ├── ClientLeaderboard.js  # 積分榜頁面 ✅
│       ├── ClientTeamList.js     # 隊伍列表頁面
│       ├── ClientTeamDetail.js   # 隊伍詳情頁面
│       ├── ClientGroupList.js    # 小組列表頁面
│       ├── ClientGroupDetail.js  # 小組詳情頁面
│       ├── ClientMatchList.js    # 比賽列表頁面
│       ├── ClientMatchDetail.js  # 比賽詳情頁面
│       └── ClientKnockoutBracket.js # 淘汰賽對戰表
```

## 開發狀態

- ✅ **ClientLeaderboard.js**: 已完成 - 顯示總積分榜和小組積分榜
- ⏳ **其他頁面**: 待實現

## 特點

- **純只讀**: 移除所有編輯、刪除、創建功能
- **自動更新**: 實時顯示最新的比賽數據
- **響應式設計**: 支援桌面和移動設備
- **簡潔界面**: 專注於資訊展示，移除管理功能
- **獨立部署**: 可單獨部署，不依賴管理端

## API 依賴

客戶端依賴以下 API 端點：

- `GET /api/tournaments/public` - 獲取公開顯示的錦標賽
- `GET /api/tournaments/:id/leaderboard/overall` - 總積分榜
- `GET /api/tournaments/:id/leaderboard/groups` - 小組積分榜
- `GET /api/tournaments/:id/teams` - 隊伍列表
- `GET /api/tournaments/:id/matches` - 比賽列表
- 其他相關 API...

## 下一步開發

請按順序實現剩餘的頁面組件，每個組件都應該：

1. 移除所有管理功能（編輯、刪除、創建按鈕）
2. 專注於資料展示
3. 保持與管理端一致的設計風格
4. 提供良好的用戶體驗