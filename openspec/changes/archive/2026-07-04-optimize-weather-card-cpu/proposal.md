## Why

目前天氣卡的雨滴動畫採用修改 `stroke-dashoffset` 的 CSS 動效，這會迫使瀏覽器在主執行緒（CPU）重新計算 SVG 的路徑描邊並執行局部重繪（Repaint）。為了在嵌入式播放系統（如 Raspberry Pi 5）上達到極致的零 CPU 佔用與畫面流暢度，需將其重構為 100% GPU 合成加速的 `translateY` 搭配 `clipPath` 的無縫循環降雨動畫。

## What Changes

- 在 `WeatherCardWidget.tsx` 中，雨天狀態的 SVG 加入 `<defs>`、`<clipPath id="overview-rain-clip">`，並在雲朵下方嵌入兩組縱向錯落的雨滴路徑 `<path>`，包裹於 clipPath 內。
- 修改 `apps/web/src/pages/Overview/overview.css`，將 `.overview-weather-rain-drop` 改為操作 `.overview-weather-rain-drops` 群組。
- 將 CSS 動畫由操作 `stroke-dashoffset` 修改為操作 `transform: translateY`，實現 100% 由 GPU Compositor 執行緒處理認領的位移動畫。

## Non-Goals

- 不調整天氣卡的任何其他視覺排版、氣溫字型或指標 chips 樣式。
- 不調整任何後端 API 與資料結構。

## Capabilities

### New Capabilities

- `overview-weather-card-cpu-optimize`: 定義天氣卡雨滴動畫的 GPU 硬件加速效能要求。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `overview-weather-card-cpu-optimize`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx`
    - `apps/web/src/pages/Overview/overview.css`
