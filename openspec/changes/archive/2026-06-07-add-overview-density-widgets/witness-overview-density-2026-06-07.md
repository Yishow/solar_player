# Overview Density Widgets — Visual Witness 2026-06-07

擷取：dev server（web 5173 / server 3000），agent-browser `set viewport 1920 1080`，
`/tmp/solar_witness/overview-after.png`。靈感對照：`docs/reference/Better/01.Overivew (大).png`。

## 結果

- 三個 density widget 全部成形並依 seed 座標排成中段一排：
  - 天氣卡（左）、三相電力表（中）、填色面積發電趨勢圖（右）。
- 趨勢圖呈現填色面積（`overview-trend-area` + Sparkline area fill），有 mock series 時可見曲線與填色。
- 密度明顯較 baseline 飽滿，hero → 第二排 widget → KPI 卡列的節奏成立。
- 版面無破版、無 NaN/null 殘影。

## 誠實記錄的限制（dev 環境資料邊界）

- 本機 dev 未設定 weather source，天氣卡顯示 fallback「天氣資料尚未就緒」（預期行為）。
- 本機 dev 無三相電力 MQTT channel（`phaseRVoltage` 等），三相表三列顯示 `--` 佔位（預期 fallback，無 NaN）。
- 「有資料」時的值渲染由單元測試覆蓋並通過：
  - `WeatherCardWidget renders weather values when available`
  - `PhasePowerTableWidget renders R/S/T rows with V/A/kW values`
  - viewModel `weather projection ... fresh` / `phase power projection reads R/S/T ...`

## Protected attributes / 例外

- nav/route、server API、SQLite、MQTT 架構未動。
- 三相 metric key 採固定慣例（`phase{R|S|T}{Voltage|Current|Power}`）；實際 topic 不同則持續走 fallback，逐欄綁定 UI 留待後續 change（design Risk 已記）。
- generationTrend 由既有 optional（預設 hidden）改為 density 預設 visible；既有 widget 測試已同步更新。

## 後續可選 polish（非本 change 阻斷項）

- 中段 widget 列與底部 KPI 列之間的垂直間距可再收緊。
- 天氣卡 fallback 態的視覺可再補一個佔位插畫，避免空洞感。
