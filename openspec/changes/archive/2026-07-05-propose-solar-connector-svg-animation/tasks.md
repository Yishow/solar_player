## 1. 重構 Solar 連接線為 SVG 動畫

- [ ] 1.1 修改 `apps/web/src/pages/Solar/index.tsx` 與 `apps/web/src/pages/Solar/solar.css`。在 `index.tsx` 中將 `connectorItems` 橫線替換成 `<svg>` 的 `<line>` 及 `<polygon>` 箭頭，將 `inverterToCo2` 替換成 `<path>` L型折線與箭頭。在 `solar.css` 中移除舊的 div 連線樣式，並加上 `.solar-flow-line` 及 `.solar-flow-line-orange` 的 `stroke-dasharray: 8 6` 與 `stroke-dashoffset: -28` 循環動畫。驗證方法：人工在網頁中檢視太陽能（Solar）頁面的連接線，確認三條連線在播放循環時無縫且流暢地流動。
