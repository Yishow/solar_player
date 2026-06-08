## 1. 資料接通前置驗證

- [x] 1.1 確認 ingestion 寫入路徑：閱讀 `apps/server/src/mqtt/MqttClientService.ts` 與相關寫入碼，確認啟用中的 topic mapping 會以其 `metric_key` 寫入 `live_metric_values`（不受 metric_key 白名單限制）；若發現白名單過濾，放寬為以 `topic_mappings` 為準。驗證：`pnpm --filter @solar-display/server test` 中 MQTT/metrics 相關測試全綠，且新增一個 server 測試斷言 `metricKey="phaseRVoltage"` 的啟用 mapping 收到訊息後會出現在 `readLiveMetricsSnapshot().metrics`。

## 2. 三相 metric keys 型別與標籤

- [x] 2.1 在 `packages/shared/src/types.ts` 的 `MetricKey` union 新增九個三相 key（`phaseRVoltage`/`phaseRCurrent`/`phaseRPower`/`phaseSVoltage`/`phaseSCurrent`/`phaseSPower`/`phaseTVoltage`/`phaseTCurrent`/`phaseTPower`），並為每個 key 提供非空 metric label。落實需求「Define three-phase power metric keys」。驗證：`pnpm run build:shared` 通過（窮舉 switch 無未覆蓋分支），新增/更新測試斷言九個三相 key 的 label 解析皆非空。

## 3. MQTT 設定頁三相 tag 管理

- [x] 3.1 先寫 red 測試再實作：`/mqtt-settings`（`apps/web/src/pages/MqttSettings/`）可為九個三相 metric key 建立、列出、啟用/停用 topic mapping，與既有 metric 管理流程一致。落實需求「Manage three-phase tags on the MQTT settings surface」。驗證：新增/更新 MqttSettings 測試先紅後綠，斷言三相 tag 出現在可管理清單且可送出建立。

## 4. Overview 三相/趨勢資料呈現

- [x] 4.1 先寫 red 測試再實作：當 `LiveMetricsSnapshot.metrics` 帶三相值時 `buildOverviewPhasePower`/`PhasePowerTableWidget` 顯示對應 R/S/T 真值（電壓 1 位、電流 1 位、功率 2 位小數），缺值顯示 `--` 且不出現 `NaN`/`undefined`、不出現 mock 值。落實需求「Surface three-phase readings to the Overview phase power widget」。驗證：`apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx` 與 `densityViewModel.test.ts` 先紅後綠。
- [x] 4.2 先確認 `realTimePower` `trendSeries` 的實際來源（實測現為平線常數 12,346，疑似誤綁 totalGeneration）：追蹤 view model 與 story payload，使 `GenerationTrendWidget` 反映即時功率時序（多點且有變化），有資料渲染面積 sparkline、無資料維持「尚無發電趨勢資料」空狀態且不渲染 sparkline。落實需求「Bind the generation trend widget to runtime trend data」。驗證：`GenerationTrendArea.test.tsx` 與 `overviewWidgets.test.tsx` 趨勢案例全綠，且新增/更新斷言 trend series 並非單一常數平線。

## 5. Better 三段版面收斂

- [x] 5.1 [P] 先寫 red 測試再實作：在 `apps/web/src/pages/Overview/displayPageConfig.ts` 與 `layout.ts` 調整座標，把目前「widget 列在 KPI 列上方」的順序對調為 Better 的 hero band → KPI 卡列 → density widget 列，使 widget 列頂端 ≥ KPI 列底端且各 band 不重疊（實測現況：widget 516–712、KPI 728–916，順序相反）。落實需求「Compose Overview hero, density row, and KPI row without overlap」。驗證：`apps/web/src/pages/Overview/layout.test.ts` 新增/更新斷言 KPI band 底端 ≤ widget band 頂端且三段不交疊，先紅後綠。
- [x] 5.2 將 `dashboardWidgets.alertNotifications.visible` 預設改為 `true`，並確認 `index.tsx` 於底部 widget 列渲染天氣/三相/趨勢/告警四欄。驗證：`overviewWidgets.test.tsx`/`densityWidgets.test.ts` 斷言四個 density widget 預設可見。
- [x] 5.3 [P] 精修 Overview-only frosted-glass 質感與間距（`apps/web/src/pages/Overview/overview.css`），維持 translucent 背景、backdrop blur、細邊、柔陰影與一致圓角，且不更動 shared card 基底與其他 playback 頁。驗證：`style.test.ts` 與 `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts` 全綠。
- [x] 5.4 把 Overview 背景照片從整頁滿版改為頂部淡出帶：`apps/web/src/pages/Overview/overview.css` 的 `.overview-page-background` 限制為上方帶（約 40% 高）並於底緣以遮罩淡出成亮底，比例近似 Better，使 KPI 卡與 density widget 坐在亮底而非照片上；標題/副標仍落在照片帶內且可讀。落實需求「Render the Overview hero photo as a faded top band, not a full-page background」。驗證：已用 `pnpm run fhd:witness`（run bg_fix1）截圖確認照片不再延伸到卡片後方；apply 時補 `style.test.ts` 綠燈。

## 6. 整合驗證與 witness

- [x] 6.1 執行受影響範圍完整測試與 build：`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、`pnpm run build` 全綠。驗證：三道指令輸出無失敗。
- [x] 6.2 從 root 執行 `pnpm run fhd:witness -- --base-url <url>` 取得 `/overview` 1920x1080 witness，與 `docs/reference/Better/01.Overivew (大).png` 比對三段節奏與四欄底列，於本 change 的 witness/evidence 記錄 pass/gap。驗證：witness PNG 產出且記錄 gap note。
