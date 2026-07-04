## Why

用電迴路（FactoryCircuit）頁面的 SVG 連接線動畫（`.factory-circuit-flow-line`）在播放循環時會出現視覺上的「跳動」或「抖動」感。這是因為動畫位移量 `stroke-dashoffset: -20` 不是虛線週期 `stroke-dasharray: 8 6`（週期為 14px）的整數倍，導致每次動畫結束重播時，虛線的相位無法對齊。

## What Changes

優化 SVG 連接線的 CSS 流動動畫：
- 將 `@keyframes factory-flow-dash` 的 `stroke-dashoffset` 結束值修改為 `-28px`，此值為虛線週期（14px）的 2 倍。
- 為了維持相近的流動速度，將動畫持續時間從 `1.5s` 調整為 `2s`。此調整能使虛線相位在每個循環結束時完美對齊，達到無縫循環播放的效果。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
