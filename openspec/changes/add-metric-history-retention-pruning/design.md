## Context

歷史資料表定義於 003 migration：`metric_snapshots`（id、各能源欄位、`captured_at`，已對 `captured_at` 建索引）、`daily_energy_summaries`（`date` TEXT PK）、`cumulative_counters`（`metric_key` PK，4 列）。`SnapshotWriterService` 每 60 秒以 `capturedAt.toISOString()` 寫入 `metric_snapshots`，永不刪除。背景服務在 `server-startup.ts` 以可注入工廠建立、`start()` 啟動、`onClose` 呼叫 `stop()`（見 MetricsAccumulatorService / SnapshotWriterService / DailySummaryService 的模式）。設定集中於 `config.ts`（透過 getter 讀 `process.env`），`.env.example` 列出支援的環境變數。

## Goals / Non-Goals

**Goals:**

- 讓 `metric_snapshots` 與 `daily_energy_summaries` 在保留期外被週期性清理，使檔案大小在穩態下趨於穩定。
- 在清出空間後以受限頻率 VACUUM 回收磁碟。
- 保留設定可由環境變數調整並有合理預設。
- cutoff 與 VACUUM 決策為可測純函式。

**Non-Goals:**

- 不清理 `cumulative_counters`（驅動目前累計總量，必須保留）。
- 不變更 `SnapshotWriterService` 的寫入頻率或 schema。
- 不新增 migration（保留為 runtime 行為，沿用既有表與索引）。
- 不提供刪除歷史的 API 或管理頁 UI（純背景維運）。

## Decisions

- **保留為背景服務，不寫成 migration 或 API**：清理是持續性維運行為，需隨時間反覆執行；以背景服務搭配既有生命週期最自然。替代方案（手動 migration 一次性刪除）無法處理持續增長。
- **cutoff 與 VACUUM 決策抽為純函式**：`metricRetentionPlan.ts` 匯出 `resolveRetentionCutoffs` 與 `shouldRunVacuum`，便於 vitest 測試邊界；服務只負責排程與 SQL 執行。
- **`captured_at` 以 ISO 字串比較、`date` 以 YYYY-MM-DD 比較**：兩者皆為 ISO 文字，字典序等同時間序，`DELETE ... WHERE captured_at < ?` 與 `WHERE date < ?` 直接成立，無需型別轉換。
- **VACUUM 受三重條件約束（啟用、有刪除、達間隔）**：完整 VACUUM 在 Pi 上成本高且會鎖庫；穩態下 retention 刪除釋出的頁面會被新插入重用，檔案不會無限增長，故 VACUUM 僅作為定期回收，預設每 7 天一次且只在本輪有刪除時考慮。替代方案 `auto_vacuum` 需建庫前設定，無法回溯既有資料庫。
- **sweep 失敗隔離**：單次 sweep 以 try/catch 包覆並 `app.log`/logger.warn 記錄，不讓例外冒泡中止 interval 或 server。

## Implementation Contract

- **Behavior**：server 運行期間，每隔固定間隔自動清掉超過保留期的快照與每日彙總；穩態下資料庫檔案大小停止無限增長；清出空間後在受限頻率下回收磁碟；清理錯誤只記 log 不影響展示與後續排程。
- **Interface / data shape**：
  - `metricRetentionPlan.ts` 匯出：
    - `resolveRetentionCutoffs(now: Date, opts: { snapshotRetentionDays: number; summaryRetentionDays: number }): { snapshotCutoffIso: string; summaryCutoffDate: string }`（`snapshotCutoffIso` 為 ISO 時間戳；`summaryCutoffDate` 為 `YYYY-MM-DD`）。
    - `shouldRunVacuum(input: { vacuumEnabled: boolean; deletedRows: number; lastVacuumAt: number | null; now: number; vacuumIntervalMs: number }): boolean`。
    - 常數 `DEFAULT_SNAPSHOT_RETENTION_DAYS = 90`、`DEFAULT_SUMMARY_RETENTION_DAYS = 1825`、`DEFAULT_RETENTION_SWEEP_INTERVAL_MS = 21600000`（6 小時）、`DEFAULT_RETENTION_VACUUM_INTERVAL_MS = 604800000`（7 天）。
  - `MetricHistoryRetentionService`：建構參數 `{ database?, logger, sweepIntervalMs?, snapshotRetentionDays, summaryRetentionDays, vacuumEnabled, vacuumIntervalMs? }`；方法 `start()`（設定 interval；可選立即跑一次）、`stop()`（清 interval）、`sweep(now: Date): { deletedSnapshots: number; deletedSummaries: number; vacuumed: boolean }`（執行刪除與條件式 VACUUM，回傳統計）。
  - `config.ts` 新增 getter：`metricSnapshotRetentionDays`（env `METRIC_SNAPSHOT_RETENTION_DAYS`，預設 90）、`dailySummaryRetentionDays`（env `DAILY_SUMMARY_RETENTION_DAYS`，預設 1825）、`metricRetentionVacuumEnabled`（env `METRIC_RETENTION_VACUUM_ENABLED`，預設 true，僅 `"false"` 視為停用）。
  - `server-startup.ts` 新增可注入 `createMetricHistoryRetentionService` 工廠，於啟動時 `start()`、`onClose` 時 `stop()`。
- **Failure modes**：`sweep` 內 SQL 失敗 → catch 後以 logger.warn 記錄、回報 0 刪除、不丟例外、不停 interval；`lastVacuumAt` 初始為 null（首次有刪除即可 VACUUM）；env 值非數字 → 退回預設。
- **Acceptance criteria**：
  - `metricRetentionPlan.test.ts` 覆蓋 `resolveRetentionCutoffs`（spec Example：2026-05-22 - 90 天 = 2026-02-21）與 `shouldRunVacuum` 的 Example 表四列。
  - `MetricHistoryRetentionService.test.ts`（以 in-memory better-sqlite3 + 003 schema）：插入跨越 cutoff 的 snapshots/summaries，`sweep` 後僅保留窗內列、`cumulative_counters` 不變；`deletedRows>0` 且達間隔時 `vacuumed=true`；模擬 SQL 失敗時不丟例外且記 log。
  - `pnpm --filter @solar-display/server test` 全綠、`pnpm run build` 通過。
- **Scope boundaries**：
  - In scope：純函式、`MetricHistoryRetentionService`、`config.ts` 設定、`server-startup.ts` 接線、`.env.example` 文件、對應測試。
  - Out of scope：`cumulative_counters` 清理、寫入頻率/schema 變更、新 migration、刪除歷史的 API/UI、live_metric_values 清理（其為單列 upsert，不增長）。

## Risks / Trade-offs

- **VACUUM 鎖庫**：以「有刪除且達 7 天間隔」限制頻率降低影響；可由 `METRIC_RETENTION_VACUUM_ENABLED=false` 完全停用。
- **保留期預設值**：90 天快照、5 年彙總為通用展示情境的保守預設；可由環境變數調整。
- **cutoff 邊界**：以 `<` 嚴格小於 cutoff 刪除，等於 cutoff 的列保留，與 spec Example 一致。
