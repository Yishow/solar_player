## 1. 佈局與預設值配置 (Layout & Configurations)

- [x] 1.1 執行 [Decision 1: 微調 KPI 卡片佈局高度以留白與預留 Hover 空間]，修改 `apps/web/src/pages/Overview/layout.ts`，將 `overviewKpiLayout` 中 5 個 KPI 卡片的高度均從 188px 調整為 180px，實現 [Overview KPI card layout and uniform spacing] 需求。驗證方式：執行 `pnpm --filter @solar-display/web test` 通過現有佈局與單元測試。
- [x] 1.2 檢查 `apps/web/src/pages/Overview/displayPageConfig.ts` 中的 `overviewMetricCardStyle` 與 seed 預設值，確保 `iconChipShape` 預設為 `rounded-square` 且 KPI 卡片高度均勻，滿足 [KPI card default styles and CO2 indicator animation]。驗證方式：檢視檔案並在網頁 runtime 中確認 5 個卡片均套用該 seed 樣式配置。

## 2. 樣式美化與互動效果實作 (CSS & Interactive Polish)

- [x] 2.1 執行 [Decision 2: 於 overview.css 中為 KPI 卡片新增毛玻璃精細化與 Hover 微互動]，修改 `apps/web/src/pages/Overview/overview.css` 中的 `.overview-kpi-card` 樣式，實作 [Frosted glass styling on Overview KPI cards] 與 [Hover micro-interactions on Overview KPI cards]。當滑鼠懸停時，卡片平滑向上浮動 4px，邊框變為綠色微光且陰影加深。驗證方式：於 root 執行 `pnpm run fhd:witness` 擷取截圖，人工檢查 Hover 互動 transition 與毛玻璃樣式無破格或重疊。
- [x] 2.2 執行 [Decision 3: 為 CO2 樹木 equivalent 綠點新增呼吸 pulsing 動畫]，修改 `apps/web/src/pages/Overview/overview.css`，在 `.overview-kpi-footer-tree-dot` 加上 `@keyframes overviewDotPulse` 動畫，實現 [KPI card default styles and CO2 indicator animation]。驗證方式：在瀏覽器中人工確認指示綠點呈現緩慢的 pulsing 呼吸效果。
