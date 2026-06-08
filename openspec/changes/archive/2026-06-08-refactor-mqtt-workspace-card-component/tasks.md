## 1. 抽離 TopicWorkspaceRow 元件

- [x] 1.1 建立 `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx` 元件，並將 Topic mapping row 相關的 HTML 與狀態綁定完全抽離至此，且加上完整 JSDoc 繁體中文註解。驗證方式為 code review 確認元件實作與傳入屬性的完整性。
- [x] 1.2 修改 `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`，導入並使用新抽離的 `TopicWorkspaceRow` 元件，驗證方式為 code review 確認元件替換無誤。

## 2. 全域樣式抽離與 CSS 問題修正

- [x] 2.1 修改 `apps/web/src/pages/MqttSettings/mqttSettings.css`，將卡片的互動樣式抽離為 `.mgmt-interactive-card` 全域類別。
- [x] 2.2 修正文字模糊問題：在 CSS 中為 `.mgmt-interactive-card` 套用 `will-change: transform; transform: translate3d(0, 0, 0); backface-visibility: hidden;`，並在 hover 時改用 `transform: translate3d(0, -2px, 0);` 確保字體光柵化對齊像素邊界。
- [x] 2.3 修正被容器擋住與遮蓋的問題：
  - 在 `.mgmt-interactive-card:hover` 中加入 `position: relative; z-index: 2;`（預設為 `z-index: 1`），避免被前後卡片遮蓋陰影。
  - 調整 `topic-workspace-list` 容器的 padding（增加 `padding: 4px 6px 12px 6px;`），確保邊緣有足夠空間，卡片 hover 位移時陰影不會被 `overflow-y` 截斷。
  - 驗證方式為執行 `pnpm run build:web` 編譯成功，並跑測試無回歸。

## 3. 測試與驗證

- [x] 3.1 執行 MqttSettings 單體測試，確認元件重構與樣式修改沒有破壞原本的商業邏輯與斷言。驗證方式為 `pnpm --filter @solar-display/web test -- "src/pages/MqttSettings/**/*.test.ts"` 通過。
