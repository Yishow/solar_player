## Why

Overview 與 Solar 目前最大的殘餘成本不是首屏，而是 live metrics / story 更新會帶動靜態 layout、hero media、connector、與 card shell 一起重算。這兩頁的版型與資料型態相近，適合先用同一個 change 把 value-only refresh 與 static subtree 分離。

## What Changes

- 將 Overview、Solar 的 static layout / media subtree 與 value-bearing subtree 明確分離。
- 鎖定 live metrics、story、weather 更新時不可重建不必要的靜態幾何與媒體輸出。
- 加入 no-regression 邊界：hero、connector、KPI、fallback banner 行為不得退化。

## Non-Goals (optional)

- 不調整 FHD 視覺目標或 editor schema。
- 不處理 FactoryCircuit、Images、Sustainability。

## Capabilities

### New Capabilities

- playback-overview-solar-value-refresh-isolation: 定義 Overview 與 Solar 在 value-only refresh 下的 static subtree 穩定邊界。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-overview-solar-value-refresh-isolation
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/Overview/index.tsx, apps/web/src/pages/Solar/index.tsx
  - Removed: (none)
