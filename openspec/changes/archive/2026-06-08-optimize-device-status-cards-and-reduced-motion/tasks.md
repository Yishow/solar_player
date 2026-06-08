## 1. 裝置狀態卡片升級與樣式優化

- [x] 1.1 修改 `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`，為其五個狀態監控卡片區塊加上 `mgmt-interactive-card`，驗證方式為 code review 確認 class 宣告。
- [x] 1.2 修改 `apps/web/src/styles/management.css`，加入 `prefers-reduced-motion: reduce` 的媒體查詢定義以優化低階裝置效能與動效可存取性，驗證方式為執行 `pnpm run build:web` 編譯成功。

## 2. 測試與驗證

- [x] 2.1 執行專案測試，確認裝置狀態卡片互動升級後，沒有破壞單體測試或造成回歸，驗證方式為 `pnpm test` 全數通過。
