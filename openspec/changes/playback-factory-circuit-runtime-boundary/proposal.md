## Why

FactoryCircuit 的殘餘成本主要來自 circuits 與 story runtime 的雙來源邊界不夠清楚：circuits refresh、dependency key、與 story update 容易互相放大，還有 refresh failure 時 last-known usable state 的保留契約需要更明確。

## What Changes

- 收斂 FactoryCircuit 的 circuits / story runtime boundary。
- 定義 refresh failure 時 last-known usable state 的保留契約。
- 鎖定 no-regression 邊界：circuit load、KPI、fallback、display sync refresh 行為不得退化。

## Non-Goals (optional)

- 不處理其他 playback 頁。
- 不改 circuit settings API 或 editor schema。

## Capabilities

### New Capabilities

- playback-factory-circuit-runtime-boundary: 定義 FactoryCircuit 的 circuits / story runtime 邊界與 last-known usable state contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-factory-circuit-runtime-boundary
- Affected code:
  - New: (none)
  - Modified: apps/web/src/pages/FactoryCircuit/index.tsx
  - Removed: (none)
