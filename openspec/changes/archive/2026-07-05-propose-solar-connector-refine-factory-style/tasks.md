## 1. 優化 Solar 連接線寬度與移除箭頭

- [ ] 1.1 修改 `apps/web/src/pages/Solar/index.tsx` 中的 SVG 繪製，將三個連接線的 `strokeWidth` 設為 `2.5`，並移除所有箭頭 `<polygon>` 元件與因箭頭而多加的 viewBox 寬度。驗證方法：人工在網頁中檢視太陽能（Solar）頁面，確認連接線線寬變細（2.5px）且沒有箭頭，動畫流暢向右/下流動。
