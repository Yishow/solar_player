## 1. 優化與美化表格區塊

- [x] 1.1 修改 `apps/web/src/pages/CircuitSettings/CircuitRow.tsx` 將 `col-display` 欄（Switch 開關、CustomSelect 下拉、validation label 等）與 `col-icon` 欄調整為更緊湊的橫向排列結構，以實現 `Refine circuits settings table visual design and density`。驗證：確認元件可正常編譯無誤。
- [x] 1.2 修改 `apps/web/src/pages/CircuitSettings/circuitSettings.css`，加入 `tr:hover` 的淡綠色高亮背景，美化臨界值 Pill、Icon 選擇區以及表格框線圓角樣式。驗證：執行 `pnpm --filter @solar-display/web build` 成功，且畫面功能完整不受影響。
