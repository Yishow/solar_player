## Why

太陽能頁面（Solar）的連接線原先是使用 CSS 的 `div` 與 `::before` / `::after` 虛擬元素拼接而成，缺乏動態流動效果。為了提升播放頁面的視覺一致性，需將其重構為 SVG 向量連接線，並套用與用電迴路（FactoryCircuit）相同的無縫虛線流動動畫。

## What Changes

將 Solar 頁面的連接線重構為 SVG 動畫連線：
- 重構 `apps/web/src/pages/Solar/index.tsx` 中 `connectorItems` 的渲染，將 `div` 元素替換為 `<svg>`，並使用 `<line>`（水平線）與 `<path>`（L型折線）繪製向量連接線與箭頭，同時為動畫圖層加上對應的 class。
- 在 `apps/web/src/pages/Solar/solar.css` 中移除原本基於 `div` 與 `::before`/`::after` 拼湊連線的樣式。
- 在 `apps/web/src/pages/Solar/solar.css` 中新增 `.solar-flow-line` 與 `.solar-flow-line-orange` 類別，實作基於 `stroke-dasharray: 8 6` 與 `stroke-dashoffset` 結束值為 `-28` 的無縫循環流動動畫（動畫時間 2s）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Solar/solar.css
