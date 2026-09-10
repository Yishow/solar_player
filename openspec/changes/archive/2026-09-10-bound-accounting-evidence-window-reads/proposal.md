## Summary

P2／Refactor：讓帳務歷史與 projection 指紋依完整來源身分及查詢窗口讀取必要 evidence，重用同次解析的選取結果，同時保留逐欄完全等價的計算與交易失效保護。

## Motivation

loadAcceptedMeterReadings 目前只以站點 scope 過濾，再將全站歷年 accepted readings 載入記憶體。projectionSamples 再於 JavaScript 篩選，同一流程的 checksum／watermark 會重讀來源；已存在的 shared sample index 已避免每天重建全歷史索引，本案不重做它。此為原始碼可見的讀取放大，尚無正式容量或延遲 benchmark，不能宣稱現場已發生效能事故。

## Proposed Solution

建立 server 內部的 bounded evidence selection：先解析 profile、完整來源身分集合、實際窗口與 asOf，再讀窗口內資料及為 opening／closing、quality、revision／epoch 診斷所需的最小邊界證據。相同 request 可共用 immutable evidence snapshot，projection checksum 與 watermark 共用同一次選取；activation 的 immediate transaction 仍以當下資料重查並驗證。以對照 oracle 與固定容量 fixture 驗證 row materialization、query plan、記憶體和延遲，保留既有 shared 演算法與精度。

## Alternatives Considered

- 只重用全站陣列：可減少重讀，但無法限制與查詢無關的歷年資料進入記憶體。
- 單純以時間範圍過濾：會遺失窗口前 baseline、來源世代或同時刻 tie evidence，因此不採用。
- 刪除 accepted readings、更換 SQLite 或直接信任 projection：涉及新資料政策／遷移風險，且削弱正確性，不採用。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `consumption-history-projections`: 補充有界 evidence 讀取、同次解析共用、projection 交易再驗證與量測驗收要求。

## Impact

- Affected specs: `openspec/specs/consumption-history-projections/spec.md`；參考不改動 `openspec/specs/meter-reading-contracts/spec.md` 與 `openspec/specs/period-consumption-deltas/spec.md`。
- Modified: `apps/server/src/services/meterReadingService.ts`、`apps/server/src/services/periodConsumptionService.ts`、`apps/server/src/services/consumptionProjectionService.ts`、`apps/server/src/services/meterReadingService.test.ts`、`apps/server/src/services/periodConsumptionService.test.ts`、`apps/server/src/services/consumptionProjectionService.test.ts`。
- New: `apps/server/src/services/accountingEvidenceSelection.ts`、`apps/server/src/services/accountingEvidenceSelection.test.ts`，分別承接查詢契約與對照／容量驗證；既有 shared 演算法只作 oracle，不拷貝到正式 runtime。
- Conditional new: `apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql`；先以 EXPLAIN QUERY PLAN 判定現有索引是否足夠，僅在不足時建立非唯一純索引 migration。實作時若 052 已被使用，改用最新空號並同步本案各 artifacts 的確切路徑；不改寫舊 migration、不改資料值或 retention。
- New verification report: `openspec/changes/bound-accounting-evidence-window-reads/evidence/accounting-read-capacity.md`；於實作驗證時記錄固定 fixture 的 baseline／optimized 對照，本次提案不預填量測結果。
- Removed: 無。日後須先整合 fix-calendar-consumption-unavailable-results 再實作本案；共同 service、tests 與主規格不可平行覆寫。
