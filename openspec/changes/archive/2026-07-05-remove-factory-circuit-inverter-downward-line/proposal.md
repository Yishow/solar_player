## Why

移除用電迴路頁（Factory Circuit）中逆變器（Inverter）下方無功能的垂直下墜線條，以優化 UI 視覺呈現。

## What Changes

- 移除 `apps/web/src/pages/FactoryCircuit/index.tsx` 中的逆變器垂直下墜向量連線 SVG 元素。

## Non-Goals (optional)

- 不調整其他任何連線與節點位置。
- 不修改任何 editor configuration 與 API。

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- Affected code:
  - Modified: apps/web/src/pages/FactoryCircuit/index.tsx
