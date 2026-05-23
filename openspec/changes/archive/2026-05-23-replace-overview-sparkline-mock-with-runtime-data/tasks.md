## 1. View model 暴露真實趨勢數列

- [x] 1.1 實作 spec requirement「Overview KPI trend renders only from runtime data」的資料面：先在 apps/web/src/pages/Overview/viewModel.test.ts 增案例（未提供 runtime 序列→每個 metric `trendSeries` 為 undefined；提供 storyOverview 含序列→帶出該序列），再在 apps/web/src/pages/Overview/viewModel.ts 為每個 metric 輸出可選 `trendSeries?: number[]`，只在 storyOverview 對應 binding 提供數值序列時填入。驗證：`pnpm --filter @solar-display/web test` 下 viewModel.test.ts RED→GREEN。

## 2. Overview 條件式渲染並移除 mock

- [x] 2.1 實作 spec requirement「Missing runtime trend hides the sparkline」與移除 mock：在 apps/web/src/pages/Overview/index.tsx 改為僅當 `metric.trendSeries` 長度 > 0 時渲染 `DisplayCardFooter` 內的 `Sparkline values={metric.trendSeries}`，否則不渲染；移除對 `trendSeries`（mocks/metrics）的 import 與使用。驗證：Overview render 測試（apps/web/src/pages/Overview/configRender.test.tsx 或既有 render 測試）斷言無 trendSeries 時不出現 `.overview-kpi-sparkline`、提供時出現；且檔案不再 import mock trendSeries。`pnpm --filter @solar-display/web test` 通過。

## 3. 整合驗證

- [x] 3.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm --filter @solar-display/web build` 全綠。驗證：兩指令成功結束、無型別或測試錯誤、無未使用 import。
