## 1. Monitoring Route Alignment

- [x] 1.1 完成 “Align the monitoring and maintenance routes as one read-heavy, runtime-sensitive batch” 並對應 ### Group read-heavy and runtime-sensitive routes into one monitoring change，明確限制本 change 只處理 `/trends`、`/history`、`/offline`、`/slideshow-preview`、`/device-status`；驗證方式為內容 review，確認 settings routes 不在本 scope。
- [x] 1.2 完成 `monitoring-pages-alignment` 的 `/trends`、`/history` prototype 對位，讓 chart、table、summary hierarchy 接近 `06` 與 `11` prototype pages；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/06-energy-trend-summary.html` 與 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/11-energy-data-history.html`。
- [x] 1.3 完成 `monitoring-pages-alignment` 的 `/offline`、`/slideshow-preview`、`/device-status` prototype 對位，讓告警、preview、maintenance sections 接近 `12`、`13`、`14` prototype pages；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照對應 prototype pages。

## 2. Runtime-Sensitive Behavior and Readability

- [x] 2.1 完成 “Preserve offline, slideshow preview, and maintenance behavior” 並對應 ### Preserve offline, preview, and maintenance behavior before visual completeness，確認 reconnect、return navigation、preview controls、progress semantics、maintenance action feedback 不回歸；驗證方式為執行 `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts`，並人工 smoke test `/offline` 與 `/slideshow-preview`。
- [ ] 2.2 完成 “Keep monitoring and maintenance content readable at FHD scale” 並對應 ### Treat readability as a contract, not a visual nice-to-have，確認長圖表、長表格、長狀態列與維護資訊在 FHD 下可讀；驗證方式為人工檢查 `/history`、`/device-status` 等高密度頁面的可讀性摘要。
