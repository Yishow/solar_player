## Why

Energy Trend 與 Energy History 目前都會讀取同一批 history data，但 warm cache 沒有共用，造成 range switch 與跨頁切換時重複 cold load。這是一個明確的 shared hotspot，適合獨立拆成單一 change。

## What Changes

- 建立 Energy Trend 與 Energy History 的 shared range-aware history cache。
- 保留 Energy History 的 partial-source semantics，不因共享 cache 而被扁平化。
- 加入 no-regression 邊界：range、chart、counter、loading / degraded 行為不得退化。

## Non-Goals (optional)

- 不改 metrics API 或 aggregation。
- 不處理其他 support 頁。

## Capabilities

### New Capabilities

- support-history-range-cache-sharing: 定義 Energy Trend 與 Energy History 的 shared range-aware warm cache 契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: support-history-range-cache-sharing
- Affected code:
  - New: apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - Modified: apps/web/src/pages/EnergyTrend/index.tsx, apps/web/src/pages/EnergyHistory/index.tsx
  - Removed: (none)
