## 1. 優化 SVG 連接線流動動畫

- [x] 1.1 修改 `apps/web/src/pages/FactoryCircuit/factoryCircuit.css` 中的 `@keyframes factory-flow-dash` 動畫，將 `stroke-dashoffset` 結束值調整為 `-28`，並將動畫持續時間調整為 `2s`。驗證方法：人工在網頁中檢視用電迴路（FactoryCircuit）頁面的連接線流動動畫，確認動畫在循環播放時無縫且無抖動。
