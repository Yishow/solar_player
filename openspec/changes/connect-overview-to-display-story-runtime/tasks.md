## 1. Shared story adapter

- [x] 1.1 實作 `Drive Overview playback metrics from the shared display-story contract`：在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/Overview/` 建立 `display-story` overview 讀取與轉接層，讓頁面能消費共享 `overview.metrics` 與 `overview.summary` payload。
- [x] 1.2 依 `Resolve Overview playback from the shared display-story contract` 與 `Keep layout config separate from story data`，保留 `display page config`、hero media 與 KPI 幾何來源，只替換 KPI 與 summary 的資料 adapter，不改版型結構。

## 2. Fallback and error handling

- [x] 2.1 實作 `Keep Overview readable when shared story data is degraded`：明確處理 story request 失敗、metric 缺值與 freshness 降級，讓 `/overview` 仍可顯示完整頁面與可讀 fallback。
- [x] 2.2 依 `Fail soft when story payload is unavailable`，確認這次接線不會把 page-local summary 文案、display config 與 runtime story contract 混成單一責任。

## 3. Verification

- [x] 3.1 補齊 `apps/web/src/pages/Overview/viewModel.test.ts` 與相關 render tests，覆蓋正常、stale、missing 與 request failure 情境。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/Overview/viewModel.test.ts src/pages/Overview/configRender.test.tsx` 與 `pnpm --filter @solar-display/web build`。
