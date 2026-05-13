## 1. Overview and Solar Alignment

- [x] 1.1 完成 “Align overview and solar pages as the first playback witness batch” 並對應 ### Align overview and solar as the first playback witness batch，明確限制這個 change 只覆蓋 `/overview` 與 `/solar`；驗證方式為內容 review，確認其他 playback routes 沒有被列入本 change。
- [x] 1.2 完成 `playback-overview-solar-alignment` 的 `/overview` prototype 對位，讓 hero、KPI、summary hierarchy 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` 檢查區塊層級。
- [x] 1.3 完成 `playback-overview-solar-alignment` 的 `/solar` prototype 對位，讓 flow summary、KPI、section rhythm 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 檢查 composition。

## 2. Runtime Contract Preservation

- [x] 2.1 完成 “Preserve playback runtime behavior for overview and solar” 並對應 ### Preserve live metrics and offline-sensitive runtime behavior，確認 route rotation、offline redirect、live metric fallback 不回歸；驗證方式為執行 `pnpm --filter @solar-display/web test -- src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts`。
- [x] 2.2 完成 “Centralize overview and solar display mapping” 並對應 ### Centralize overview and solar display mapping in page-local adapters，把 display fields 與 fallback classification 集中在 adapter / view-model 層；驗證方式為 code review，確認頁面 JSX 沒有重複的 raw metric branching。
