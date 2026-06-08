## 1. 重構卡片元件與 CSS 樣式

- [x] 1.1 修改 `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx`，加入 `renderInputGroup` 輔助函數，將原本重複的 Topic / Unit 輸入框語法抽象化；同時移除重複的 `meta-divider` 元素。驗證方式為 code review 元件邏輯。
- [x] 1.2 修改 `apps/web/src/pages/MqttSettings/mqttSettings.css`，調整 `.topic-workspace-row__meta` 樣式，使用 `span + span::before` 偽元素自動渲染間隔圓點，並移除與已刪除 DOM 相關的 CSS 規則。驗證方式為執行 `pnpm run build:web` 編譯成功。

## 2. 測試與驗證

- [x] 2.1 執行 MqttSettings 單體測試，確認代碼優化沒有破壞原本的輸入行為與文字渲染。驗證方式為執行 `pnpm --filter @solar-display/web test -- "src/pages/MqttSettings/**/*.test.ts"` 通過。
