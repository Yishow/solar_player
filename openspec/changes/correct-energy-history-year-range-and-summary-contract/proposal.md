## Problem

`/history` 的 `year` 頁籤目前沒有獨立的年度語意：前端會把 `year` 轉成 `total` 查詢，summary 端也沒有年度篩選邏輯。操作員以為自己在看今年資料，實際上卻看到累積資料，這會直接誤導營運判讀。

## Root Cause

`Energy History` 的 range contract 沒有把 `year` 當成一級語意處理。前端、history API、summary 聚合三者之間缺少一致的 period definition，所以 UI label 與資料來源發生 drift。

## Proposed Solution

- 建立 `day / week / month / year / total` 的一致 range contract，讓 `year` 有獨立的 snapshot 與 summary 選取語意。
- 修正前端與 server 的查詢映射，避免再以 `total` 冒充 `year`。
- 補上 range-specific tests，確保年度資料與累積資料不再混淆。

## Success Criteria

- `/history` 的 `year` 頁籤只顯示當年度資料，不再重用 `total`。
- `Energy History` 的 snapshots、daily summaries 與 counters 使用者看到的 range label 一致。
- 測試可區分 `year` 與 `total` 的資料邊界與 UI 輸出。

## Impact

- Affected code:
  - Modified: `apps/web/src/pages/EnergyHistory/index.tsx`
  - Modified: `apps/web/src/pages/EnergyHistory/viewModel.ts`
  - Modified: `apps/web/src/pages/EnergyHistory/viewModel.test.ts`
  - Modified: `apps/server/src/routes/metrics-history.ts`
  - Modified: `apps/server/src/routes/metrics-history.ts`
  - Modified: `apps/server/src/services/DailySummaryService.ts`

## Capabilities

### New Capabilities

- `energy-history-range-semantics`: 定義 Energy History 的年度與累積期間語意，避免 period label 與實際資料來源不一致。

### Modified Capabilities

(none)
