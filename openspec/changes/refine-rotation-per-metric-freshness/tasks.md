## 1. Shared 純函式：所需 metric 與逐頁新鮮度

- [x] 1.1 實作 spec requirement「Resolve the live metric keys a page requires」：先在 packages/shared/src/displayPageFreshness.test.ts 覆蓋 solar 的 Example（結果含 realTimePower、todayGeneration、selfConsumptionEnergy、consumptionEnergy），再在 packages/shared/src/displayPageFreshness.ts 實作 `resolveLiveMetricKeysForPage(templateKey)`（mqtt-metric→requirementKey；derived-metric→dependencyKeys ?? [requirementKey]；去重；非 live-data 頁回空陣列）。驗證：`pnpm --filter @solar-display/shared` 受影響測試 RED→GREEN。
- [x] 1.2 [P] 實作 spec requirement「Evaluate page runtime freshness over the page's required metrics」：在 displayPageFreshness.test.ts 覆蓋 Example 表三列（全新鮮→fresh、含 todayGeneration@60000→stale 且 stalestMetricKey=todayGeneration、無 present→fresh=false 且 stalest 為 null），並含時間戳無法 parse 視為過期一案，再實作 `evaluatePageRuntimeFreshness`。驗證：該測試通過。
- [x] 1.3 在 packages/shared/src/index.ts 匯出 `resolveLiveMetricKeysForPage` 與 `evaluatePageRuntimeFreshness`。驗證：server 可透過 `@solar-display/shared` 匯入，`pnpm run build` 通過。

## 2. Server：rotation 改用逐頁新鮮度

- [x] 2.1 實作 spec requirement「Rotation uses per-page freshness instead of the global latest timestamp」：在 apps/server/src/services/displayRotationService.ts 修改 `buildPageConditions`，為每個 live-data page 以 `resolveLiveMetricKeysForPage(page.templateKey)` + `evaluatePageRuntimeFreshness({ requiredMetricKeys, metrics: liveMetrics.metrics, nowMs: now.getTime(), freshnessWindowMs })` 計算 `pageFresh` 與 stalest 資訊，移除全域 `metricsFresh`。驗證：`pnpm --filter @solar-display/server test` 既有 rotation 測試仍綠。
- [x] 2.2 調整 `resolveRuntimeDataCondition` 以 `pageFresh: boolean` 與 `stalestTimestamp: string | null` 取代 `metricsFresh`/`liveMetricsTimestamp`，stale 時 detail 指出最舊所需 metric 的時間戳，並維持 mock mode 與 `staleData !== "hide"` 照播分支；同步更新 `isReady` 使用 `pageFresh`。驗證：既有 `apps/server/src/routes/playback.test.ts` 與 display-ops 相關測試仍綠。

## 3. Server 整合測試

- [x] 3.1 在 apps/server/src/routes/playback.test.ts 新增案例：seed 兩個 live-data 頁與 `live_metric_values`，頁 A 所需 metric 時間戳在 window 內、頁 B 所需 metric 時間戳已過期；呼叫 `/api/display-pages/rotation-preview` 後斷言頁 B 以 `stale-runtime` 出現在 skippedPages、頁 A 在 playablePages。驗證：`pnpm --filter @solar-display/server test` 下新增案例通過。

## 4. 整合驗證

- [x] 4.1 執行 `pnpm run build`、`pnpm --filter @solar-display/server test` 與 `pnpm --filter @solar-display/web test` 全綠。驗證：指令成功結束、無型別或測試錯誤。
