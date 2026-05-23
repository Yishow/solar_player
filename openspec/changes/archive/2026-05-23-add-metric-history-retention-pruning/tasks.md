## 1. 純函式：cutoff 與 VACUUM 決策

- [x] 1.1 先在 apps/server/src/services/metricRetentionPlan.test.ts 覆蓋 `resolveRetentionCutoffs`（spec Example：now=2026-05-22T00:00:00Z、snapshot 90 天→snapshotCutoffIso=2026-02-21T00:00:00.000Z；summary cutoff 為對應日期字串），再在 apps/server/src/services/metricRetentionPlan.ts 實作 `resolveRetentionCutoffs` 與常數 `DEFAULT_SNAPSHOT_RETENTION_DAYS=90`、`DEFAULT_SUMMARY_RETENTION_DAYS=1825`、`DEFAULT_RETENTION_SWEEP_INTERVAL_MS=21600000`、`DEFAULT_RETENTION_VACUUM_INTERVAL_MS=604800000`。驗證：`pnpm --filter @solar-display/server test` 下該檔 RED→GREEN。
- [x] 1.2 [P] 實作 spec requirement「VACUUM runs only after a prune and at a limited frequency」的決策：在 metricRetentionPlan.test.ts 覆蓋 `shouldRunVacuum` 的 Example 表四列（啟用+有刪+達間隔→true、未達間隔→false、無刪除→false、停用→false），再實作 `shouldRunVacuum`。驗證：該測試通過。

## 2. 保留服務

- [x] 2.1 實作 spec requirement「Metric snapshots are pruned beyond a retention window」與「Daily energy summaries are pruned beyond a retention window」：先寫 apps/server/src/services/MetricHistoryRetentionService.test.ts（以 in-memory better-sqlite3 套用 003 schema，插入跨 cutoff 的 metric_snapshots 與 daily_energy_summaries，`sweep(now)` 後僅保留窗內列、回傳正確 deletedSnapshots/deletedSummaries），再實作 apps/server/src/services/MetricHistoryRetentionService.ts 的 `sweep` 以 `resolveRetentionCutoffs` + `DELETE ... WHERE captured_at < ?` / `WHERE date < ?` 執行。驗證：該檔 RED→GREEN。
- [x] 2.2 實作 spec requirement「Cumulative counters are never pruned」：在 MetricHistoryRetentionService.test.ts 增案例—sweep 前後 `cumulative_counters` 列數與內容不變；確認 service 的 SQL 不觸及該表。驗證：該案例通過。
- [x] 2.3 實作 spec requirement「VACUUM runs only after a prune and at a limited frequency」的執行接線：在服務內以 `shouldRunVacuum` 判定後執行 `database.exec("VACUUM")` 並更新內部 `lastVacuumAt`；MetricHistoryRetentionService.test.ts 增案例—有刪除且達間隔時 `sweep` 回傳 `vacuumed=true`、未達間隔時 `vacuumed=false`。驗證：該案例通過。
- [x] 2.4 實作 spec requirement「Retention sweep runs on a background schedule tied to server lifecycle」：實作 `start()`（setInterval(sweep, sweepIntervalMs)）與 `stop()`（clearInterval），且 `sweep` 以 try/catch 包覆，SQL 失敗時 logger.warn 記錄、回傳 0 刪除、不丟例外。MetricHistoryRetentionService.test.ts 增案例—注入會丟錯的 database 時 `sweep` 不丟例外且呼叫 logger.warn。驗證：該案例通過。

## 3. 設定與接線

- [x] 3.1 在 apps/server/src/config.ts 新增 getter `metricSnapshotRetentionDays`（env METRIC_SNAPSHOT_RETENTION_DAYS，預設 90）、`dailySummaryRetentionDays`（env DAILY_SUMMARY_RETENTION_DAYS，預設 1825）、`metricRetentionVacuumEnabled`（env METRIC_RETENTION_VACUUM_ENABLED，預設 true，僅字串 "false" 視為停用），非數字 env 退回預設。驗證：apps/server/src/config.test.ts 增案例覆蓋預設與覆寫，`pnpm --filter @solar-display/server test` 通過。
- [x] 3.2 在 apps/server/src/server-startup.ts 新增可注入 `createMetricHistoryRetentionService` 工廠，啟動時以 config 值建立並 `start()`，並在既有 `onClose` hook 內呼叫其 `stop()`。驗證：apps/server/src/server-startup.test.ts 增案例—注入假工廠後啟動會呼叫 start、app 關閉會呼叫 stop。
- [x] 3.3 在 .env.example 新增並註解 `METRIC_SNAPSHOT_RETENTION_DAYS`、`DAILY_SUMMARY_RETENTION_DAYS`、`METRIC_RETENTION_VACUUM_ENABLED` 三個變數與其預設值。驗證：人工檢視 .env.example 含三個變數且預設值與 config.ts 一致。

## 4. 整合驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/server test` 與 `pnpm run build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤。
