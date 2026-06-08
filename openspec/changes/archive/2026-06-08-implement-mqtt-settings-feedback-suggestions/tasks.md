## 1. 實作建議改進與測試

- [x] 1.1 在 `apps/web/src/styles/tokens.css` 與 `apps/web/src/styles/management.css` 中將互動卡片的設計樣式代碼化為全域 CSS 變數，驗證方式為執行 `pnpm run build:web` 編譯成功。
- [x] 1.2 建立 `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts` 元件單體測試，覆蓋指標、文字、輸入欄位與 coverage 等渲染驗證，驗證方式為 `pnpm --filter @solar-display/web test` 順利通過。

## 2. 最終驗證

- [x] 2.1 執行 MqttSettings 單體測試，確認代碼優化與 token 套用沒有破壞原本的渲染邏輯與斷言。驗證方式為測試通過。
