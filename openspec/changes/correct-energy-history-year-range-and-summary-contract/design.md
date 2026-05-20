## Context

`Energy History` 目前提供 `day / week / month / year / total` 五個 range，但前端把 `year` 映射成 `total`，而 summary filter 也沒有年度邏輯。結果頁籤顯示的 period label 與實際資料來源不一致，對營運判讀是直接的 correctness 問題。

## Goals / Non-Goals

**Goals**

- 讓 `year` 成為一級 range，而不是 `total` 的別名。
- 對齊 snapshots、daily summaries 與 UI range label 的期間語意。
- 補齊年度與累積期間的 regression coverage。

**Non-Goals**

- 不重做 `Energy History` 畫面結構。
- 不修改 cumulative counter 的資料儲存模型。
- 不把 `Energy Trend` 的整體產品化範圍併入這個 correctness change。

## Decisions

### Treat year as a first-class range instead of aliasing total

server 與 web 都要把 `year` 視為獨立期間。history snapshots 必須有自己的年度 query clause，summary aggregation 也必須能按年度切出當年資料，而非直接重用累積資料。

### Align snapshot, summary, and counter labels to the same period contract

`Energy History` 的 UI 不應讓同一個 range 同時讀取不同期間語意。對 `year` 而言，snapshots 與 summary 都應是當年，`total` 才代表累積。counter 若仍代表累積，只能在 `total` 路徑下使用。

替代方案是保留現有 counters 並在 `year` 頁籤上混搭累積資訊，但那只會讓 UI label 更難信任。

## Implementation Contract

- Behavior: `/history` 的 `year` 頁籤 SHALL 顯示當年度 snapshots 與年度 summary，不再使用 `total` 查詢結果冒充年度資料。
- Interface / data shape: `/api/metrics/history` SHALL 支援 `range=year` 的獨立 period semantics；前端 range mapping SHALL 將 `year` 送往年度 query，而不是重新命名為 `total`。
- Failure modes: 若年度資料不足，UI 可以顯示空 state 或部分資料，但不得回退成累積資料卻仍標示為 `year`。
- Acceptance criteria: server route tests 與 `apps/web/src/pages/EnergyHistory/viewModel.test.ts` SHALL 區分 `year` 與 `total` 的 period output；手動檢查 `year` 頁籤時，頁內摘要與圖表 period label 一致。
- Scope boundaries: 本 change 只修正 `Energy History` 的年度與累積語意，不處理 `Energy Trend` 的新 operator workflow。

## Risks / Trade-offs

- [Risk] 現有資料表不足以完整表達年度聚合 → Mitigation: 先以既有 snapshots / daily summaries 做明確年度篩選，避免再用錯誤 period 假裝完整。
- [Risk] view model 仍混入 cumulative counter 值 → Mitigation: 將 counter 使用限制在 `total` 路徑，並用測試鎖住 `year` 不再讀 total-only 值。
