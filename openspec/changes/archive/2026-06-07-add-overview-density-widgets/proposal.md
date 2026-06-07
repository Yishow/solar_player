## Why

現況 `Overview` 播放頁 hero 區中段大片留白、底部 KPI 卡質感扁平，整體資訊密度與節奏遠低於可交付水準（對照 `docs/reference/Better/01.Overivew (大).png`）。需要把第二排資訊帶（天氣、三相電力表）、填色面積發電趨勢圖補上，並讓這些區塊一律由 `/display-pages/editor` 維護，而不是 page-local hardcode。

## What Changes

- 在 `Overview` 新增三個 editor-maintainable widget：
  - **天氣卡**：綁既有 `WeatherCurrentSnapshot` / weather contract，顯示天氣狀態、氣溫、濕度與觀測時間；缺資料時走 seed fallback。
  - **填色面積發電趨勢圖**：升級既有 `GenerationTrendWidget`，由折線 sparkline 改為填色 area trend，沿用 viewModel 既有 `trendSeries`。
  - **三相電力表**：以 R/S/T 三相 × 電壓(V)/電流(A)/功率(kW) 呈現，讀取既有 `LiveMetricsSnapshot.metrics` 開放 key channel；缺 channel 時走 seed fallback。
- 為三個 widget 在 shared 層新增可持久化的 config schema，並接上 editor inspector control、draft/live persistence、runtime renderer、seed fallback、validation/reset。
- 對 `Overview` hero 字級節奏與 KPI 卡 surface/icon/間距做 polish，朝 Better 的密度與節奏收斂（非像素級）。

## Non-Goals

- 不改 nav/route 結構、底部導覽組成，也不照搬 Better 的 nav（維持現有五條 playback route）。
- 不改 server API、SQLite schema、MQTT 連線架構；三相電力與天氣皆復用既有資料管道，不新增資料源。
- 不重算 FHD 固定畫布縮放模型；新增 widget 以既有絕對座標 layout 模型放置。
- 不處理 Solar/Factory Circuit/Images/Sustainability 四頁的 FHD closeout（列後續 change）。
- 不以 page-local hardcode 繞過 editor；editor 無法表達的差距須先補 editor capability。

## Capabilities

### New Capabilities

- `overview-density-widgets`: 讓 `Overview` 播放頁具備 editor 可維護的天氣卡、填色面積發電趨勢圖與三相電力表，且 editor preview / draft save / publish 後的 runtime route 共享同一套 widget config 與 seed fallback。

### Modified Capabilities

(none)

## Impact

- Affected specs: `overview-density-widgets`
- Affected code:
  - New:
    - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
    - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - Modified:
    - packages/shared/src/index.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/viewModel.ts
    - apps/web/src/pages/Overview/layout.ts
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
