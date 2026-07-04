## 1. 調整化學式標籤與 CSS 單行限制

- [x] 1.1 依據決策 "1. JSX 中套用 <sub> 標籤"，修改 `apps/web/src/pages/Overview/OverviewKpiFooter.tsx`，將 footer 中的 `co2` 改為 `CO<sub>2</sub>`。驗證方式：`pnpm run build` 成功。
- [x] 1.2 依據決策 "2. CSS 單行強制排版與縮放"，修改 `apps/web/src/pages/Overview/overview.css` 中的 `.overview-kpi-footer-tree` 及 `.overview-kpi-footer-tree-text`，將字型大小調整為 `11.5px`，並在 `.overview-kpi-footer-tree-text` 加入 `white-space: nowrap;`。驗證方式：核對 CSS 屬性。
- [x] 1.3 修改 `apps/web/src/pages/Overview/kpiFooter.test.tsx` 測試，將對 CO2 樹木換算的斷言從原本的 `平均吸收160kg co2）` 改為 `平均吸收160kg CO<sub>2</sub>）`，以滿足 "KPI card default styles and CO2 indicator animation" 需求。驗證方式：執行 `pnpm --filter @solar-display/web test` 驗證測試綠燈。
