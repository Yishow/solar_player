## 1. Shared refresh scopes and invalidation sources

- [x] 1.1 擴充 `packages/shared/src/displayOps.ts` 與相關 wiring，為 sustainability 與 monitoring history 建立可辨識的 refresh scopes。對應 design topic: decision: add dedicated display-sync scopes for sustainability and monitoring history.
- [x] 1.2 在 `apps/server/src/services/MetricsAccumulatorService.ts`、`apps/server/src/services/SnapshotWriterService.ts`、`apps/server/src/services/DailySummaryService.ts` 與必要的 sustainability story 更新點補上精準 invalidation emit。對應 design topic: decision: emit invalidation from the services that persist or derive the affected data.

## 2. Page-local runtime refresh wiring

- [x] 2.1 更新 `apps/web/src/pages/runtimeRefreshRegistry.ts` 與相關 hooks，讓 `Sustainability`、`Energy Trend`、`Energy History` 能把 relevant signal 映射到各自的 data reload 流程。對應 design topic: decision: refresh page-local data loaders instead of full playback reload.
- [x] 2.2 調整三個頁面的 loader 與 refresh handling，直接落實 `Refresh Sustainability data when its underlying runtime story changes` 與 `Refresh monitoring history pages when persisted history data changes`，並確保重抓後保留目前 range / period。

## 3. Verification

- [x] 3.1 補齊 server / web tests，覆蓋 snapshot/summary/story 更新會送出 signal，以及三頁在 signal 到達時會重抓資料並保留當前 selection。
- [x] 3.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze add-runtime-refresh-for-sustainability-and-monitoring-history`。
