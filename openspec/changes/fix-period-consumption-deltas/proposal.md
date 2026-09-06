# E2｜以累積電錶差值計算日／月／年用電

## Why

日、月、年用電必須是同一電錶在同一期間的讀值差，不是當前累積數字，也不是所有累積樣本相加。既有 daily summary 已做 clampDelta，但缺少完整 meter epoch、明確時區、缺基準與跨界品質契約。

## Problem and Evidence

DailySummaryService 在 service initialize 時用當下 counters 作 baseline，日期切换時以當下 counters 結束舊日並開始新日；負差以 max(...,0) 截掉。MetricResolver 同時存在 JS local-day 與 SQL/UTC date 邊界。這些是程式觀察，不代表已用現場資料重現所有症狀。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

新增唯一期間差值 resolver，以 source observation time、電錶身分與明確廠區時區解析期間。保留可稽核基準、端點樣本、品質、缺口與演算法版本；所有 downstream 用同一契約。

## Non-Goals

不新增電價引擎、不對缺日線性補值、不將未知 reset 當 0、不對輸入已是 daily delta 的 channel 再做一次差值；不在本 change 改 UI。

## Capabilities

### New Capabilities

- `period-consumption-deltas`：以累積電錶差值計算日／月／年用電；具體規則與例外見同目錄 specs。

### Modified Capabilities

- `monitoring-history-accumulation`：以本 change 的 MODIFIED delta 更新既有完整 requirement，保留未涉及行為。

## Dependencies and Delivery Boundary

- 類型：Bug Fix。
- 優先序：P0。
- 前置 change：E1 / add-meter-reading-contracts。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/server/src/services/DailySummaryService.ts`
  - `apps/server/src/services/MetricsAccumulatorService.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `packages/shared/src/periodConsumption.ts`
  - `apps/server/src/services/periodConsumptionService.ts`
  - `apps/server/src/services/periodConsumptionService.test.ts`
- Removed: 無。
- Specification artifacts: `openspec/changes/fix-period-consumption-deltas/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。
