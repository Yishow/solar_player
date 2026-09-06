# E3｜修復用電歷史、期間 API 與可回退重算

## Why

只修新進資料不會修好已經錯誤或缺基準的歷史圖表。必須讓 history、月圖、年/月/日摘要與匯出共同讀取同一個可追溯的期間結果。

## Problem and Evidence

EnergyTrend/viewModel 目前把 snapshot.consumption 加總，且各 range 均優先讀 live consumptionEnergy；MetricResolver 按 scope 讀歷史，但 day/year 的日期邊界與 month 不同。既有 daily_summary 表型別沒有完整 coverage/provenance。

基準：13535147ad47613cf80b2321d12cb131b30264ab（main，2026-09-04 提交）。來源與觀察界限以本 change 的 Problem and Evidence 與 design.md 為準。這是依原始碼與使用者回報起草的 change，不是現場測試報告。

## What Changes

建立 versioned consumption projections 與管理端重算流程；保留現有 endpoints 及授權，增補 periodSummary 與 quality。舊 snapshots 保持其原本 counter 語意，不偷偷改成另一種單位。

## Non-Goals

不刪原始歷史、不偽造缺失 baseline、不建立新計費服務；不更動 unrelated 發電、CO2 或電價係數；不在啟動時自動全庫破壞性重算。

## Capabilities

### New Capabilities

- `consumption-history-projections`：修復用電歷史、期間 API 與可回退重算；具體規則與例外見同目錄 specs。

### Modified Capabilities

- `monitoring-history-accumulation`：以本 change 的 MODIFIED delta 更新既有完整 requirement，保留未涉及行為。

## Dependencies and Delivery Boundary

- 類型：Bug Fix。
- 優先序：P0。
- 前置 change：E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E6 / add-site-energy-accounting-profiles。
- 可先評審草案；只有前置契約及對應驗證完成後才可以進入相依實作。
- 本 change 以自己的 tasks 作實作進度來源；其他 change 未完成不能靠此 change 臨時 hardcode 代替。

## Success Criteria

- 每一個 requirement 的 GIVEN / WHEN / THEN 必須由 test-plan 指定的驗證層實際驗證。
- 失敗狀態、權限與跨廠區隔離和正常狀態同為交付條件。
- 保存來源或草稿不代表發布；伺服器發布不代表裝置已套用。
- 所有實作 task、受影響測試、實際 pnpm verify 及必要人工驗收完成後才可 archive。

## Impact

- Existing files to modify（基準路徑／整合點，實作前須依最新 main 再確認）：
  - `apps/server/src/routes/metrics-history.ts`
  - `apps/server/src/services/MetricResolver.ts`
  - `apps/server/src/services/DailySummaryService.ts`
  - `apps/web/src/pages/EnergyTrend/viewModel.ts`
  - `apps/web/src/pages/EnergyHistory/viewModel.ts`
  - `apps/web/src/services/api.ts`
  - `apps/server/src/services/derivedMetricCatalogService.ts`
  - `apps/server/src/services/MetricHistoryRetentionService.ts`
  - `apps/web/src/pages/EnergyTrend/index.tsx`
  - `apps/web/src/pages/EnergyHistory/index.tsx`
  - `packages/shared/src/playbackMetricContract.ts`
- Proposed new implementation files（尚未建立，不是本包已實作）：
  - `apps/server/src/services/consumptionProjectionService.ts`
  - `apps/server/src/services/consumptionProjectionService.test.ts`
  - `scripts/rebuild-consumption-projections.mjs`
- Removed: 無。
- Specification artifacts: `openspec/changes/repair-consumption-history-projections/`。
- 本包只新增提案檔；不含應用程式修正、資料库 migration 執行或正式資料更新。

## V2 Revision

補上E3-R8，由E6持有廠區總量/部門来源/比較基準，U6提供四步及日常捷徑。不再要求使用者自行跨頁拼湊設定或編寫公式。
