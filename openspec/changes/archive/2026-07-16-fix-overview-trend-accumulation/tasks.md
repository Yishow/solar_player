## 1. 累積資料正確性

- [x] 1.1 依「Mock energy readings use deterministic cumulative totals」落實 requirement「Monitoring counters and daily summaries accumulate continuously」的 mock 邊界：同日與跨日的 `totalGeneration`、`consumptionEnergy`、`selfConsumptionEnergy` 不倒退且小於 1,000 kWh 的發電變化可見；先在 `apps/server/src/services/MockMetricsFeedService.test.ts` 寫失敗案例，再以直跑該測試驗證。
- [x] 1.2 依「Current-day summaries are persisted on every service tick」完成 requirement「Monitoring counters and daily summaries accumulate continuously」的 summary 邊界：當日 `processAt` 立即 upsert delta，重建 service 後延續同日既有 summary；先在 `apps/server/src/services/DailySummaryService.test.ts` 寫失敗案例，再以直跑該測試驗證。
- [x] 1.3 依「MQTT restart recovery reads persisted history before new messages」完成 requirement「Monitoring counters and daily summaries accumulate continuously」的正式模式重啟邊界：`MetricsAccumulatorService` 從 persisted counters 恢復，Overview display story 在沒有新 MQTT message 時仍從 current-day `metric_snapshots` 回傳 trend，且 server-startup 維持只有 `data_mode=mock` 才啟動 mock feed；在 `apps/server/src/services/MetricsAccumulatorService.test.ts`、`apps/server/src/routes/display-story.test.ts` 與既有 startup test 補 regression assertions，直跑三組測試驗證。

## 2. Overview runtime 刷新

- [x] 2.1 依「Monthly consumption reuses the monitoring-history refresh lifecycle」更新 requirement「Render three-phase power from existing metric channel with fallback」：`PhasePowerTableWidget` 初次讀 month summaries 並在 `monitoring-history` sync 後重讀，失敗或空資料維持空狀態；先在 `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx` 加 refresh scope 失敗測試，再直跑該測試與 web suite 驗證。

## 3. 整體驗證

- [x] 3.1 驗證「Mock energy readings use deterministic cumulative totals」、「Current-day summaries are persisted on every service tick」、「MQTT restart recovery reads persisted history before new messages」、「Monthly consumption reuses the monitoring-history refresh lifecycle」的整體 contract：執行 `spectra validate --strict --changes fix-overview-trend-accumulation`、`pnpm test`、`pnpm run build`，並以 fresh Overview FHD witness 確認發電趨勢與月用量曲線都有可信 runtime 資料、MQTT mode 重啟後不需 mock 或新 message 仍可見、且版面未退化。
