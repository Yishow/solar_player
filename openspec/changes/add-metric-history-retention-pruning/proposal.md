## Why

`SnapshotWriterService` 每 60 秒寫入一筆 `metric_snapshots`（約 1,440 筆/天、52 萬筆/年），且全 repo 沒有任何保留或清理機制，`metric_snapshots` 與 `daily_energy_summaries` 會永久累積。對部署在 Raspberry Pi、需連續運行數月至數年的展示機，SQLite 檔案會持續膨脹、歷史查詢逐漸變慢，最終可能耗盡磁碟。本變更新增可設定的歷史資料保留與背景清理，並在清出空間後以受限頻率執行 VACUUM 回收磁碟。

## What Changes

- 新增純函式 `resolveRetentionCutoffs(now, { snapshotRetentionDays, summaryRetentionDays })` 計算 `metric_snapshots` 的時間戳 cutoff 與 `daily_energy_summaries` 的日期 cutoff。
- 新增純函式 `shouldRunVacuum({ deletedRows, lastVacuumAt, now, vacuumIntervalMs, vacuumEnabled })` 決定本輪清理後是否執行 VACUUM（避免每輪都 VACUUM）。
- 新增 `MetricHistoryRetentionService`：依設定間隔週期性刪除超過保留期的 `metric_snapshots`（依 `captured_at`）與 `daily_energy_summaries`（依 `date`），並在實際刪除且達到 VACUUM 間隔時執行一次 `VACUUM`；遵循既有 start/stop 生命週期並於 `onClose` 停止。
- `cumulative_counters` 不在清理範圍（僅 4 列，用於目前累計總量），明確保留。
- 在 `config.ts` 與 `.env.example` 新增保留設定：`METRIC_SNAPSHOT_RETENTION_DAYS`（預設 90）、`DAILY_SUMMARY_RETENTION_DAYS`（預設 1825）、`METRIC_RETENTION_VACUUM_ENABLED`（預設啟用）。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Capabilities

### New Capabilities

- `metric-history-retention`: 週期性清理超過保留期的指標歷史資料並在需要時回收磁碟空間。

### Modified Capabilities

(none)

## Impact

- Affected specs: metric-history-retention（新增）
- Affected code:
  - New:
    - apps/server/src/services/metricRetentionPlan.ts
    - apps/server/src/services/MetricHistoryRetentionService.ts
  - Modified:
    - apps/server/src/config.ts
    - apps/server/src/server-startup.ts
    - .env.example
  - Removed:
    - (none)
