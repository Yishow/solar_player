## 1. 移除通用與管理介面的卡片位移

- [x] 1.1 移除 [management.css](file:///Users/yishow/prj/solar_player/apps/web/src/styles/management.css) 中 `.mgmt-card:hover` 與 `.mgmt-interactive-card:hover` 的 `transform: translateY(-2px)`。驗證方式：開啟瀏覽器檢查管理卡片在 hover 時僅有背景色、邊框色與陰影轉場，而不會產生任何位移。
- [x] 1.2 移除 [circuitSettings.css](file:///Users/yishow/prj/solar_player/apps/web/src/pages/CircuitSettings/circuitSettings.css) 中 `.cs-readiness-item:hover` 的 `transform: translateY(-1px)`。驗證方式：確認電路設定頁面的準備度項目在 hover 時保持原地不動，無上移效果。
- [x] 1.3 移除 [imageManagement.css](file:///Users/yishow/prj/solar_player/apps/web/src/pages/ImageManagement/imageManagement.css) 中相關卡片在 hover 時的 `translateY` 動態效果。驗證方式：確認圖片管理頁面的卡片在 hover 時沒有位移。
- [x] 1.4 移除 [DataSourceSettings/index.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/pages/DataSourceSettings/index.tsx) 中卡片的 `hover:-translate-y-0.5` Tailwind 類別。驗證方式：檢查資料源設定卡片 hover 時不會有位移，僅有陰影變化。

## 2. 移除素材庫與播放頁面的卡片位移與縮放

- [x] 2.1 移除 [assetLibrary.css](file:///Users/yishow/prj/solar_player/apps/web/src/pages/AssetLibrary/assetLibrary.css) 中 `.asset-library-card:hover` 的 `transform: translateY(-2px) scale(1.01)`，以及 `.detail-glass-card:hover` 的 `transform: translateY(-1px)`。驗證方式：手動測試素材庫卡片 hover 時，卡片本身不發生位移或整體縮放，僅有預覽圖內部縮放與按鈕浮現。
- [x] 2.2 移除 [images.css](file:///Users/yishow/prj/solar_player/apps/web/src/pages/Images/images.css) 中卡片在 hover 時的 `translateY(-1px)` 與縮放動畫。驗證方式：確認播放清單卡片在 hover 時沒有任何位移，無抖動現象。
