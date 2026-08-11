## Why

目前 `DailySummaryService` 在下一個 polling tick 才發現 local date 已跨日，並用該 tick 的最新 cumulative counters 結算前一天，因此午夜後第一段增量可能被算進昨天；現有 regression test 也把這個行為當成預期結果。另一方面，retention days 環境變數只解析整數而不驗證正值，負數會把 cutoff 推到未來，使 retention sweep 有機會大量刪除仍應保留的歷史資料。兩者都會傷害歷史資料的可稽核性。

## What Changes

- 日結改用最後一筆屬於前一 local day 的已處理 counter snapshot 關閉前一天；午夜後才觀測到的增量不得回灌昨天。
- 新 local day 的 baseline 從前一天 closing counters 延續，第一筆 post-midnight delta 歸到新一天。
- 修正並擴充跨午夜、restart around midnight 與 peak timestamp regression tests，移除把錯誤歸日當成正確結果的 assertion。
- `METRIC_SNAPSHOT_RETENTION_DAYS` 與 `DAILY_SUMMARY_RETENTION_DAYS` 若明確設定，必須是大於 0 的整數；不合法時 server 在啟動 retention worker 前 fail closed。
- retention service 不得在 invalid explicit config 下執行 DELETE 或 VACUUM。

## Non-Goals

- 不重算既有 production database 中歷史上可能已歸錯日的資料；只修正往後寫入。
- 不改能源報告 UI；報告與目標由後續 change 新增。
- 不更改 retention 預設值 90 天與 1825 天。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `monitoring-history-accumulation`: local-day rollover 必須把 post-midnight 增量歸到新一天，且 restart 邊界行為可重現。
- `metric-history-retention`: 明確設定的 retention window 必須先驗證為正整數，invalid config 不能進入 destructive sweep。

## Impact

- Affected specs: `monitoring-history-accumulation`, `metric-history-retention`
- Affected code: `DailySummaryService`, retention plan/config parsing、server startup validation、相關 tests 與 `.env.example` 說明。
- Affected data: 不做 backfill；新寫入 summary 會採修正後的 local-day boundary semantics。
- Dependency: `add-energy-goals-and-reports` 應在本 change 完成後使用修正過的日統計作為正式來源。
