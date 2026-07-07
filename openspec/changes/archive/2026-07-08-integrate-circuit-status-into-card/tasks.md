## 1. 狀態列整合至卡片標題

- [x] 1.1 修改 `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx` 移除了頂層的 `cs-status` 元素，並在 `cs-card` 的 `settings-card__title` 之中整合 `Integrate status indicator into factory circuits card title`。驗證：確認 `/settings/circuits` 元件能正常 build 成功。
- [x] 1.2 修改 `apps/web/src/pages/CircuitSettings/circuitSettings.css`，移除 `cs-status` 的絕對定位屬性，改為符合標題列內 `display: inline-flex` 與 `margin: 0` 的佈局。驗證：執行 `pnpm --filter @solar-display/web build` 成功。

## 2. 表格與輸入框視覺美化優化

- [x] 2.1 修改 `apps/web/src/pages/CircuitSettings/circuitSettings.css` 裡面的 `.cs-page .cs-input` hover 與 focus 狀態、`.cs-page .cs-delete` 的紅色 hover 漸變與按鈕圓角，以及 `.cs-page .cs-legend` 的陰影結構，以實現 `Enhance input controls and table visuals on circuit settings page`。驗證：執行 `pnpm --filter @solar-display/web build` 成功，且沒有破壞現有的 CRUD 介面排版。
