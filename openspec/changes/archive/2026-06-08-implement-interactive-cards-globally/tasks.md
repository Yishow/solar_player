## 1. 升級設定頁面卡片為互動卡片

- [x] 1.1 修改 `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`，為其三個 `settings-card` 區塊加上 `mgmt-interactive-card`，驗證方式為 code review 確認 class 宣告。
- [x] 1.2 修改 `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx`，為電路設定卡片加上 `mgmt-interactive-card`，驗證方式為 code review 確認 class 宣告。
- [x] 1.3 修改 `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`，為圖片庫與圖片編輯器兩個卡片加上 `mgmt-interactive-card`，驗證方式為 code review 確認 class 宣告。
- [x] 1.4 修改 `apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx`，為四個設定卡片（播放順序、播放時長、手動控制、螢幕配置）加上 `mgmt-interactive-card`，驗證方式為 code review 確認 class 宣告。

## 2. 樣式去重與整理

- [x] 2.1 修改 `apps/web/src/pages/PlaybackSettings/playbackSettings.css`，移除重疊的 settings-card hover 陰影與邊框變更定義，完全交由 `.mgmt-interactive-card` 代勞，驗證方式為執行 `pnpm run build:web` 編譯成功。

## 3. 測試與驗證

- [x] 3.1 執行專案測試，確認全域卡片互動升級後，沒有破壞各設定頁面的單體測試與商業邏輯，驗證方式為 `pnpm test` 全數通過。
