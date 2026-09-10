## 1. 鎖定失敗與相容路徑

- [x] 1.1 在 apps/server/src/services/periodConsumptionService.test.ts 建立 day、month、year 各自的計算讀取失敗與 projection 讀取失敗 fixture，落實 Canonical unavailable results do not trigger legacy consumption fallback；先以 focused suite 證明舊版回 null 的失敗，再斷言非 null、unavailable、null valueKwh 與各 range 診斷。
- [x] 1.2 在同一 service suite 補足正常數值、有效零值、week／total 原 issues、global／no-profile，以及 profile lookup 本身失敗的對照；驗證只有明確相容路徑回 null，未知設定不能偽裝成缺席。
- [x] 1.3 [P] 在 apps/web/src/pages/EnergyHistory/viewModel.test.ts 加入 unavailable payload 與 987654.321 legacy sentinel、有效零值和 no-profile fixtures；以該 focused suite 斷言消耗卡不使用 sentinel 或合成零，相容路徑保持原狀。
- [x] 1.4 [P] 在 apps/web/src/pages/EnergyTrend/viewModel.test.ts 加入相同 unavailable／zero／no-profile 判斷表；以該 focused suite 斷言趨勢消耗不把 unavailable 轉成 legacy 數值。

## 2. 恢復 canonical failure 訊號

- [x] 2.1 依「日曆失敗結果」修正 apps/server/src/services/periodConsumptionService.ts 的 tryResolvePersistedPeriodConsumption：僅在已取得 profile 的 calendar failure 建立 unavailable result，使用可證明的 context、不偽造 boundary 或 coverage；執行 1.1、1.2 fixtures 驗證六個失敗入口與既有 span 行為。
- [x] 2.2 落實「安全診斷與零次補查」：只接受 1–64 字元的大寫英數底線 code，其他使用 PERIOD_CONSUMPTION_RESOLUTION_FAILED，catch 不讀 DB；以同 service suite 的無 code、有效／不合法／超長 code、SQL message 和 read-count spy 證明有界診斷與零次補查。
- [x] 2.3 在 apps/server/src/routes/metrics-history.test.ts 驗證「Canonical 消費端防退回」：profile 與其他 API reads 可用時保留 periodSummary failure，全 DB outage 仍走非成功回應；必要時只修 apps/server/src/routes/metrics-history.ts 的 failure 傳遞，以 API payload、status 與 sentinel assertions 驗證，不重塑 envelope。
- [x] 2.4 重跑 1.3、1.4；僅在回歸失敗時調整 apps/web/src/pages/EnergyHistory/viewModel.ts 或 apps/web/src/pages/EnergyTrend/viewModel.ts 的 unavailable 判斷，驗證 failure、zero、no-profile 三者不混淆，不修改畫面設計。

## 3. 最終驗證與依賴交接

- [x] 3.1 執行受影響 server／web focused suites、pnpm verify、git diff --check，回讀最終 diff 確認僅 proposal Impact 範圍，記錄 PASS／FAIL／NOT RUN；確認本案完成後才能實作 bound-accounting-evidence-window-reads，後者 oracle 必須包含本案 unavailable regressions，且不平行覆寫共同檔案。
