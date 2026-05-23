## Context

`apps/web/src/pages/Overview/index.tsx` 對每張 KPI 卡渲染 `<Sparkline values={trendSeries} />`，其中 `trendSeries` 是寫死陣列（`apps/web/src/mocks/metrics.ts`）。`apps/web/src/pages/Overview/viewModel.ts` 的 `buildOverviewViewModel` 產出 `metrics[]`（每項含 label、value、unit 等），但不含任何趨勢數列。story runtime payload（`useDisplayStoryRuntime` / shared 的 monitoring binding）目前沒有逐 metric 的時間序列欄位，故前端無真實趨勢可顯示。相同 mock 也被 Sustainability 頁使用。

## Goals / Non-Goals

**Goals:**

- Overview KPI 卡不再顯示來自 mock 的固定趨勢線。
- 預留 view model 的真實趨勢數列接口，未來 runtime 提供時可直接渲染。

**Non-Goals:**

- 不改 Sustainability 頁（同樣使用 mock，但本變更只處理 Overview）。
- 不新增後端趨勢序列 API 或在 story payload 新增序列欄位（本變更不負責供給真實序列，只負責不再顯示假序列且接受真實序列）。
- 不改 `Sparkline` 元件本身。

## Decisions

- **view model 暴露可選 `trendSeries?: number[]`，僅來自 runtime**：`buildOverviewViewModel` 的每個 metric 增加 `trendSeries`，只有當傳入的 `storyOverview` metric binding 提供數值序列時才填入；目前無此欄位故為 `undefined`。理由：保持「不捏造」同時保留型別化接口，未來真實序列接上即可顯示。
- **元件條件式渲染**：Overview 僅當 `metric.trendSeries` 存在且長度 > 0 時渲染 `Sparkline` 與其 `DisplayCardFooter`，否則不渲染 footer/sparkline。理由：缺真實資料時寧可不顯示，也不顯示假線。
- **移除 mock import**：刪除 Overview 對 `trendSeries`（mocks/metrics）的 import 與使用，避免殘留假資料路徑。

## Implementation Contract

- **Behavior**：Overview KPI 卡在目前（無 runtime 序列）狀態下不再顯示任何趨勢線；當 view model 之後能提供真實 `trendSeries` 時，對應卡片會渲染該序列的 sparkline。
- **Interface / data shape**：
  - `OverviewViewModel` 的每個 metric 物件新增可選欄位 `trendSeries?: number[]`。
  - `buildOverviewViewModel` 從 `storyOverview` 的對應 metric binding 取數值序列填入 `trendSeries`；無則不設（`undefined`）。
  - Overview 元件：`metric.trendSeries && metric.trendSeries.length > 0` 為真時渲染 `<DisplayCardFooter><Sparkline values={metric.trendSeries} /></DisplayCardFooter>`，否則不渲染。
- **Failure modes**：`trendSeries` 為 undefined 或空陣列 → 不渲染 sparkline，不丟例外；不再 import mock，移除後不得有未使用 import。
- **Acceptance criteria**：
  - `apps/web/src/pages/Overview/viewModel.test.ts` 增案例：未提供 runtime 序列時每個 metric 的 `trendSeries` 為 `undefined`；提供序列時帶出該序列。
  - Overview 渲染測試（`apps/web/src/pages/Overview/configRender.test.tsx` 或既有 render 測試）斷言：無 `trendSeries` 時不渲染 `.overview-kpi-sparkline`；提供時渲染。
  - 程式碼不再 import `trendSeries`（mocks/metrics）於 Overview。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：Overview view model 增 `trendSeries`、Overview 條件式渲染、移除 mock import、對應測試。
  - Out of scope：Sustainability 頁、後端/Story payload 序列供給、`Sparkline` 元件。

## Risks / Trade-offs

- **視覺變化**：目前狀態下 Overview 卡會少掉趨勢線；屬刻意移除捏造資訊，可接受。
- **Sustainability 仍有相同 mock**：本變更不處理，已於 Non-Goals 標明，避免範圍擴張。
