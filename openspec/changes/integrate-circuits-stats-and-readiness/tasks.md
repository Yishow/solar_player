## 1. 整合統計與 readiness 看板區

- [x] 1.1 修改 `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx`，加入 `.cs-summary-panel` 容器，將 `cs-stats`（統計條）放右側，`cs-readiness` 與 `cs-readiness-list`（狀態與 findings 列表）放左側，以實現 `Integrate stats and readiness sections into a layout panel`。驗證：確認 `/settings/circuits` 元件正常建置。
- [x] 1.2 修改 `apps/web/src/pages/CircuitSettings/circuitSettings.css` 增加 `.cs-summary-panel` 相關 grid/flex 排版，並將 `.cs-stats` 改為三列 (3 columns) 的 Grid 佈局，優化左側 `.cs-readiness` 狀態標籤為 100% 寬度往右填滿，並精緻化警示卡片在 hover 時的平滑陰影與上浮互動特效。驗證：執行 `pnpm --filter @solar-display/web build` 成功。
