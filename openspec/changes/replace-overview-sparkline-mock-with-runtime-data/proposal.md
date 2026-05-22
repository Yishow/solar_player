## Problem

Overview 頁的每張 KPI 卡都渲染一條趨勢 sparkline，但其資料來源是寫死的 mock 陣列 `trendSeries`（來自 mocks/metrics）。在即時頁面上呈現一條與真實資料無關的固定趨勢線，等於對外顯示捏造的歷史走勢，違反本專案「只顯示可信遙測、不得捏造數值」的原則。

## Root Cause

Overview 直接 import 並把 mock `trendSeries` 傳給每張卡的 `Sparkline`，view model 並未提供任何來自 runtime 的真實趨勢資料，元件也未在缺真實資料時隱藏 sparkline。

## Proposed Solution

- 在 Overview view model 的每個 metric 輸出新增可選欄位 `trendSeries?: number[]`，僅當 runtime（story payload）提供真實數列時才填入；目前 runtime 無趨勢數列，故為 `undefined`。
- Overview 改為「僅當該 metric 具有真實 `trendSeries`（長度 > 0）時才渲染 sparkline 與其 footer」，否則不渲染。
- 移除 Overview 對 mock `trendSeries` 的 import 與使用。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Success Criteria

- Overview KPI 卡不再渲染任何來自 mock 的固定趨勢線。
- 當 view model 未提供真實 `trendSeries` 時，卡片不顯示 sparkline。
- 當 view model 提供真實 `trendSeries` 時，卡片渲染對應的 sparkline。
- view model 測試覆蓋「無 runtime 數列→trendSeries 為 undefined」與「有 runtime 數列→帶出該數列」。

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/viewModel.ts
    - apps/web/src/pages/Overview/viewModel.test.ts
  - New:
    - (none)
  - Removed:
    - (none)
