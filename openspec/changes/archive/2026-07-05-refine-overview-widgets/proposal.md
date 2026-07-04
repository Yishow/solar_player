## Why

為了簡化 Overview 播放頁面的「發電趨勢」圖表視覺，以及將「三相電力」區塊替換為更有商業價值的「月用量曲線」圖表，需要調整這兩個 Dashboard 邊界組件的顯示與內容。

## What Changes

- 移除發電趨勢組件（GenerationTrendWidget）右上角的 3 個時間區間切換按鈕（Today, 7D, 30D），僅保留更新頻率說明。
- 將原本的三相電力組件（PhasePowerTableWidget）重構為月用量曲線組件，展示過去 30 天的每日用電量趨勢。
- 月用量曲線組件應使用與發電趨勢類似的平滑填充曲線（Sparkline smooth path with gradient fill）以及座標軸標記，並設定對應的 mock 數據以在 Socket 未連線時展示。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `overview-dashboard-widgets`: 修改發電趨勢 widget，移除右上角 Today / 7D / 30D 日期切換頁籤。
- `overview-density-widgets`: 修改三相電力 widget，將其顯示的 R/S/T 三相電力表格替換為過去 30 天的月用量曲線圖表。

## Impact

- Affected specs:
  - `overview-dashboard-widgets`
  - `overview-density-widgets`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
    - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
    - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
    - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/displayPageConfig.ts
