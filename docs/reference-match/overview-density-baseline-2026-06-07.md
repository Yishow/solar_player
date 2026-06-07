# Overview 密度收尾 Baseline Witness — 2026-06-07

Witness 來源：`pnpm dev`（web 5173 / server 3000），agent-browser `set viewport 1920 1080`，
擷取五個 playback route 於 `/tmp/solar_witness/*.png`。靈感參考：`docs/reference/Better/01.Overivew (大).png`。
界線：Better 僅作靈感方向，**不改 nav/route 結構、不改 server API / SQLite / MQTT 架構**。

## 資料邊界盤點（決定 schema 設計）

- 天氣：`packages/shared/src/weather.ts` 已有 `WeatherCurrentSnapshot`、`WeatherSettings`、CWA source spec。
  → 天氣卡綁既有 weather contract，不新增資料源。
- 即時指標：`LiveMetricsSnapshot.metrics` 為 `Record<string, LiveMetricReading>`（開放 key）。
  → 三相電力可走既有 metric channel（如 `phaseRVoltage/Current/Power`），無需改 snapshot 結構；
     MQTT 未 publish 時走 seed fallback。
- 趨勢：Overview viewModel 已輸出 `trendSeries`（realTimePower）。
  → 面積趨勢圖沿用，升級為填色 area 視覺。

## 五頁現況 gap（本輪只動 Overview，其餘列後續 change）

### /overview（本輪主角）
- Hero 區中段大片留白，標題 group 與 hero 圖之間缺中間內容帶，整體鬆散。
- 底部 5 張 KPI 卡擠在最下緣；卡片 surface/icon shell 偏弱、扁平。
- 缺：天氣卡、三相電力表、明顯的填色面積趨勢圖（現有 widget 為 optional，預設未展示密度）。
- 目標（朝 Better 密度）：hero 帶 → 第二排（天氣 + 三相電力表）→ 趨勢面積圖 + 警報 → KPI 卡列。

### /solar、/factory-circuit、/images、/sustainability
- 本輪不動，僅記錄已有 React 實作；FHD closeout 列後續 Spectra change。

## 本輪 scope（已獲使用者批准）
1. 天氣卡（綁 weather contract + seed fallback）
2. 填色面積趨勢圖（升級既有 trend widget）
3. 三相電力表（R/S/T × V/A/kW，metric channel + seed fallback）
4. Overview hero/KPI 卡質感 polish，朝 Better 密度與節奏收斂（非像素級）

全部走 editor capability-first：shared schema → inspector control → draft/live persistence
→ runtime renderer → seed fallback → validation/reset → targeted tests。禁止 page-local hardcode 繞過 editor。
