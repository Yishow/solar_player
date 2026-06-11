## Why

Sustainability 的主要殘餘成本集中在 selectedPeriod 切換：目前缺少 per-period warm cache，導致 period switch back 容易回到 cold state。這頁也需要更明確的 highlight / stat / household-equivalent refresh 邊界，避免 period 切換時整頁不必要重組。

## What Changes

- 建立 per-period warm cache。
- 規範 selectedPeriod、highlight rail、stat、household-equivalent 的 refresh boundary。
- 鎖定 no-regression 邊界：period selection、fallback、visible stat output 不得退化。

## Non-Goals (optional)

- 不改頁面版型或 editor schema。
- 不處理其他 playback 頁。

## Capabilities

### New Capabilities

- playback-sustainability-period-cache: 定義 Sustainability 的 per-period warm cache 與 selected-period refresh boundary。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-sustainability-period-cache
- Affected code:
  - New: (none)
  - Modified: apps/web/src/hooks/useSustainabilityStoryRuntime.ts, apps/web/src/pages/Sustainability/index.tsx
  - Removed: (none)
