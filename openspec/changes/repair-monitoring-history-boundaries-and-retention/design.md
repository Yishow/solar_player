## Context

Daily summary 目前保存 day baseline 與 cumulative counters，每分鐘 `processAt()` 一次。當第一次 post-midnight tick 出現時，service 先看到 date key 改變，再以該 tick 已含新一天增量的 counters 寫回舊 date。這在資料連續上升時會讓前一天偏高、新一天偏低。Retention 則直接用 config days 計算 `now - days`；signed negative integer 會形成 future cutoff。

## Goals / Non-Goals

**Goals:**

- 前一天 summary 永遠不包含已知為 post-midnight 才觀測到的增量。
- rollover 與 restart 行為 deterministic，測試使用 local-day boundary 明確驗證。
- invalid explicit retention window 在任何 destructive query 前被拒絕。
- 保留既有 defaults、表結構與正常 retention 行為。

**Non-Goals:**

- 不推算午夜兩側 polling gap 中每一秒的精確功率分配。
- 不自動修復已存在的舊 daily rows。
- 不新增報表 API。

## Decisions

### 保存 last processed counters 與其 local day

DailySummaryService 每次成功處理時保留 `lastProcessedCounters` 與 `lastProcessedDateKey`。若下一次 tick 已跨日，前一天 closing counters 使用最後一筆仍屬前一天的 counters，而不是 post-midnight current counters。完成舊日結算後，新日 baseline 設為該 closing counters；因此兩次觀測之間無法再細分的增量保守地歸入新一天，不會污染已結束日。

這比直接使用 post-midnight counters 更符合日界線語意，也不需要從 cumulative source 猜測午夜瞬間值。若未來需要秒級精確分割，可另以 source timestamp/power integration change 處理。

### 在啟動邊界驗證 destructive config

新增專用 parser，例如 `readPositiveIntegerEnv(name, fallback)`：環境變數未設定時使用既有 default；明確提供但不是 base-10 正整數時丟出啟動錯誤。Server 必須在建立/啟動 `MetricHistoryRetentionService` 前完成驗證。

選擇 fail closed 而不是把 `-30` 靜默 fallback 到 90，因為 typo 若被吞掉會讓 operator 誤以為自訂 retention 已生效；對 destructive retention 設定應讓部署明確失敗。

### Retention service 再做 defensive assertion

即使 startup 已驗證，`resolveRetentionCutoffs`/service constructor 仍拒絕非正值，避免 tests 或未來其他 caller 繞過 config parser。

## Implementation Contract

- 23:59 最後處理 counters 為 100、00:01 counters 為 103 時，前一天不得因 00:01 tick 增加 3；新一天 baseline 以舊日 closing counters 為起點，使該增量歸到新日。
- restart 同一天時仍從 persisted current-day summary 重建 baseline；restart 跨日後不得把 restart 後 counters 回寫舊日。
- explicit retention values `0`、負數、小數、空白以外的非數字均拒絕啟動；unset 使用 default。
- invalid retention config 下測試必須證明沒有 DELETE/VACUUM 執行。

## Migration Plan

不需要資料庫 migration。部署前後表結構相同。升級後只影響新的 summary rollover 與 config validation。若 production `.env` 曾使用 0/負數，部署會 fail closed，operator 必須先改成正整數再啟動。

## Risks / Trade-offs

- [Risk] polling gap 跨午夜時，最後一筆 pre-midnight 到午夜間的少量增量可能被新日吸收 → 明確選擇「不把 post-midnight observation 寫回舊日」的保守語意；日後若需精確分割再新增高解析 boundary sampling。
- [Risk] fail-closed config 讓原本被容忍的錯字變成啟動失敗 → 錯誤訊息列出 env 名稱與合法格式，部署驗證可在 service stop 前預檢。
