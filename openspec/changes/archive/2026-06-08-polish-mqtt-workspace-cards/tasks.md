## 1. UI 結構調整與樣式優化

- [x] 1.1 調整 `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx` 中的 HTML 結構，使 `topic-workspace-row` 內容能夠以更現代的兩欄/網格佈局排列，驗證方式為 code review 確認 DOM 結構。
- [x] 1.2 在 `apps/web/src/pages/MqttSettings/mqttSettings.css` 中重構 `topic-workspace-row` 樣式，引進 HSL 設計的和諧配色、精細的微陰影、以及 hover 變換（微小位移與邊框高亮），並優化文字排版（包含 metadata 使用點號分隔水平排列），驗證方式為執行 `pnpm run build:web` 確認無編譯錯誤，並透過瀏覽器或人工 witness 檢查外觀質感。

## 2. 測試與驗證

- [x] 2.1 執行專案測試，確認沒有因為 HTML/CSS 變動而導致現有機制或測試失敗，驗證方式為執行 `pnpm test` 通過。
