## Why

`Energy Trend` 與 `Energy History` 目前已有資料與畫面，但整體仍偏展示頁：來源邊界、freshness、empty/error state、以及 operator 解讀語意都還不夠產品化。即使 range correctness 修正後，這兩頁仍缺少「拿來做日常監看」所需的狀態語意。

## What Changes

- 把 `Energy Trend` 與 `Energy History` 補成 operator-oriented monitoring surfaces，而不只是視覺化頁面。
- 明確顯示資料來源、更新鮮度、降級狀態、與空資料時的可讀行為。
- 對齊 live snapshot、daily summary、cumulative counter 在兩頁中的角色，減少「有數據但不知道可信度」的情況。

## Non-Goals

- 不重做這兩頁的整體視覺設計。
- 不把整個能源分析擴成新的 BI 模組。

## Capabilities

### New Capabilities

- `energy-monitoring-operator-workflows`: 定義 `Energy Trend` 與 `Energy History` 在 freshness、degraded state、資料來源與 empty/error state 上的 operator workflow。

### Modified Capabilities

(none)

## Impact

- Affected specs: `energy-monitoring-operator-workflows`
- Affected code:
  - Modified: `apps/web/src/pages/EnergyTrend/index.tsx`
  - Modified: `apps/web/src/pages/EnergyTrend/viewModel.ts`
  - Modified: `apps/web/src/pages/EnergyTrend/viewModel.test.ts`
  - Modified: `apps/web/src/pages/EnergyHistory/index.tsx`
  - Modified: `apps/web/src/pages/EnergyHistory/viewModel.ts`
  - Modified: `apps/web/src/pages/EnergyHistory/viewModel.test.ts`
  - Modified: `apps/server/src/routes/metrics-history.ts`
