## Context

`/overview` 為展示播放器門面，現行實作已具備 Better 參考圖的所有元件（hero、5 KPI、weather/phasePower/generationTrend/alertNotifications widget），但有三個問題：

1. **版面順序**：1920x1080 實測 DOM 量測（非依 seed config 推論），density widget 列實際在 canvas `top 516–712`、KPI 列在 `728–916`，兩列**已不重疊**（中間 16px 間隙）；真正問題是**順序與 Better 相反**（現為 hero → widget → KPI，Better 為 hero → 中段 KPI → 底部 widget），需把 KPI 列移到 widget 列上方。
2. **告警 widget 隱藏**：`dashboardWidgets.alertNotifications.visible` 預設 `false`，實測底部僅 3 個 widget，破壞 Better 四欄節奏。
3. **三相全空**：實測三相表三相皆為 `--`。`buildOverviewPhasePower` 讀 snapshot 的 `phase{R,S,T}{Voltage,Current,Power}`，但 `MetricKey` union 不含這些 key，導致它們不是一級 metric，MQTT 頁無從以正規方式建立/管理對應 tag。
4. **趨勢退化**：實測 `GenerationTrendWidget` sparkline 所有點同高（y 固定）、值固定為 12,346（等於 totalGeneration KPI），呈平線而非即時功率時序；趨勢並非「空白」而是疑似誤綁累積值，須於 apply 確認 `realTimePower` `trendSeries` 來源。

關鍵既有事實：server `live_metric_values` 以 `metric_key` 字串自由索引，`readLiveMetricsSnapshot` 會把所有 row 讀進 `metrics[metric_key]`；前端 `buildOverviewPhasePower` 已在讀 `phaseRVoltage`/`phaseRCurrent`/`phaseRPower`（R/S/T）。因此 snapshot 與 viewModel 兩端已就緒，缺口在型別、MQTT 管理 UI、以及 ingestion 是否以 mapping 的 metric_key 寫入。

## Goals / Non-Goals

**Goals:**

- Overview 重排為三段不重疊的垂直節奏（hero → 中段 5 KPI 列 → 底部 4 widget 列），對齊 Better。
- 啟用 `alertNotifications` widget 維持底部四欄。
- 三相 metric keys 成為一級 `MetricKey`，可在 MQTT 設定頁建立/連結/管理 tag，並讓 `PhasePowerTableWidget` 取得真實值。
- `GenerationTrendWidget` 由既有 `realTimePower` runtime 趨勢餵入。

**Non-Goals:**

- 不改 shared card 基底、route shell、server API envelope、SQLite/MQTT 架構。
- 不注入任何 mock/示意資料；無 runtime 資料維持既有空狀態。
- 三相 metric 不納入 `mqtt-settings-display-coverage` 必備集合（選用 tag）。
- 不改其他 playback 頁外觀。

## Decisions

- **Snapshot key 命名**：沿用前端既有讀法，metric key 為 camelCase `phase{R|S|T}{Voltage|Current|Power}`（如 `phaseRVoltage`）。MQTT topic mapping 的 `metricKey` 必須等於這些字串，ingestion 才會把值寫入 `live_metric_values` 對應 row，snapshot 隨即帶出。理由：避免改動已實作且測試覆蓋的前端讀取路徑。
- **型別一級化 vs 純自由字串**：選擇把九個三相 key 加入 `MetricKey` union。理由：topic mapping 雖接受自由字串，但 metric 標籤、selectable tag 清單與型別檢查需要一級定義；不一級化會讓 MQTT 頁無法以正規下拉/標籤呈現，也無 metric label。
- **版面座標來源**：仍透過既有 Overview display page config / seed（`displayPageConfig.ts` + `layout.ts`）維護，不在頁面 hardcode。中段 KPI 列與底部 widget 列為兩個不重疊的水平 band。
- **趨勢資料**：不新增資料來源，沿用 `realTimePower` 的 `trendSeries`（metrics history），僅確認其能流入 `GenerationTrendWidget`。

## Implementation Contract

**Behavior（可觀察結果）：**

- 在 1920x1080 下，Overview 由上而下為三個垂直不重疊 band：hero band（右側媒體 + 左側雙語標題）、中段 5 張 KPI 卡列、底部 4 個 density widget 列（天氣 / 三相電力 / 發電趨勢 / 告警通知）。
- 當 `live_metric_values` 具備三相 metric（透過 MQTT topic mapping 寫入）時，`/overview` 三相電力表顯示對應 R/S/T 的電壓(V,1 位小數)/電流(A,1 位小數)/功率(kW,2 位小數)；缺值欄位顯示 `--` 且不出現 `NaN`/`undefined`。
- MQTT 設定頁可為九個三相 metric key 建立、連結、啟用/停用 topic mapping（tag），與既有 metric 的管理方式一致。
- 當有 `realTimePower` runtime 趨勢資料時，`GenerationTrendWidget` 以面積 sparkline 呈現；無資料時維持「尚無發電趨勢資料」空狀態。

**Interface / data shape：**

- `MetricKey` union 新增：`phaseRVoltage`、`phaseRCurrent`、`phaseRPower`、`phaseSVoltage`、`phaseSCurrent`、`phaseSPower`、`phaseTVoltage`、`phaseTCurrent`、`phaseTPower`。
- Topic mapping（既有 shape `MqttTopicMapping`）以這些字串作為 `metricKey`；不新增欄位。
- Live snapshot（`LiveMetricsSnapshot.metrics`）以相同 key 暴露 `LiveMetricReading`。
- Overview display page config 的 `dashboardWidgets` 與 `kpiCards` 座標調整為三段 band；`alertNotifications.visible` 預設 `true`。

**Failure modes：**

- 任一三相欄位無 reading → 該欄 `--`（既有 `formatPhaseValue` 行為），widget 仍渲染標題與表格骨架。
- 全部三相無 reading → `phasePower.available=false`，沿用既有 fallback row 樣式。
- 無趨勢資料 → 趨勢 widget 空狀態文案，不渲染 sparkline。

**Acceptance criteria：**

- 既有 server + web 測試全綠：`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`。
- 新增/更新測試覆蓋：(a) 版面三段不重疊（layout.test.ts 斷言 KPI band 與 widget band 垂直區間不交疊）；(b) `alertNotifications` 預設可見；(c) `MetricKey` 含九個三相 key 且 metric label 解析不為空；(d) MQTT 設定頁可建立三相 tag；(e) snapshot 帶三相值時 `PhasePowerTableWidget` 顯示真值（沿用既有 widget 測試風格，不得出現 mock 值如 586）。
- `pnpm run fhd:witness -- --base-url <url>` 對 `/overview` 取得 1920x1080 witness，與 Better 參考圖比對三段節奏與四欄底列。

**Scope boundaries：**

- In scope：Overview 版面座標/CSS、`alertNotifications` 預設可見、`MetricKey` 三相 key、MQTT 設定頁三相 tag 管理、server snapshot/ingestion 對三相 metric_key 的支援驗證、相關測試與 witness。
- Out of scope：其他 playback 頁、shared card 基底、API envelope、coverage 必備集合、任何 mock 資料、circuit/factory metric。

## Risks / Trade-offs

- [ingestion 未以 mapping 的 metric_key 寫入 live_metric_values] → apply 第一步先驗證 MqttClientService 的寫入路徑；若發現以白名單過濾 metric_key，於同 change 內放寬為以 topic_mappings 為準。
- [版面座標調整影響 freeform object / runtime config 既有資料] → 沿用 `withContentOffset` 與既有 config 結構，僅調 band 座標，並以 layout 測試守住不重疊；不更動 config schema 欄位。
- [新增 MetricKey 可能觸發窮舉 switch 的型別錯誤] → build 階段 `tsc` 會抓出未覆蓋分支，於 apply 補齊 label/對應處理。

## Migration Plan

- 無資料庫 schema 變更（topic_mappings/live_metric_values 既有欄位即可）。
- 既有 runtime display page config 若已存座標，於 apply 確認 seed 預設與 runtime 對齊；必要時更新 seed 預設座標，runtime 由既有 hydration 機制覆蓋。
