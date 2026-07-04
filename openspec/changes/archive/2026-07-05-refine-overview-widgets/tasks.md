## 1. 調整發電趨勢組件

- [x] 1.1 修改 `apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx`，移除 `Today / 7D / 30D` 日期頁籤容器，並保留「15s 更新」的提示文字，以實現 "Overview generation trend widget renders a full data-visualisation chart"。驗證方式：執行 `pnpm --filter @solar-display/web test` 確保測試通過。
- [x] 1.2 更新 `apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx` 檔案，移除對 `Today`, `7D`, `30D` 頁籤文字的 `assert.match` 斷言。驗證方式：執行 `pnpm --filter @solar-display/web test` 確保測試綠燈。

## 2. 實作月用量曲線組件

- [x] 2.1 依據設計決策 "1. 曲線渲染方式與數據對齊" 與 "2. 數據取得與 Fallback 設計"，重構 `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx`，將其更名為或改寫為 `MonthlyConsumptionWidget`（但仍保留檔案路徑與導出組件名稱以避免破壞 playback 系統相容性，或將其重構以實現 "Render three-phase power from existing metric channel with fallback"）。組件在掛載時向 `/api/metrics/daily-summary?range=month` 取得用電量歷史資料，並利用 `toSparklineSmoothPath` 渲染 SVG 平滑綠色填充漸層曲線，並包含 Nice Ceil Y 軸水平格線、5 個等距 X 軸時間標籤（`MM/DD`）以及頂峰數值標註（帶 `kWh` 單位）。當 API 失敗或無資料時自動回退到一組 30 點的 mock 數據。驗證方式：藉由 `pnpm run build` 成功構建。
- [x] 2.2 更新 `apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx` 的測試斷言，移除對三相電力表格 R/S/T 欄位數值的斷言，改為斷言「月用量曲線」標題、SVG 圖表元素以及 Fallback 渲染不崩潰。驗證方式：執行 `pnpm test` 並直跑該檔測試以確保測試綠燈。

## 3. 整合與配置微調

- [x] 3.1 修改 `apps/web/src/pages/Overview/displayPageConfig.ts` 中的 `overviewDashboardWidgetRegions` 宣告，將 `phasePower` 的說明文字（description）和標籤（label）更新為「月用量曲線 / Overview Widget Monthly Consumption」。驗證方式：內容審查此檔案的配置項，並確認 `pnpm run build` 綠燈。
