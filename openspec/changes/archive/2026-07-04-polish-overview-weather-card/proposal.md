## Why

為了解決 `/overview` 頁面中天氣卡 (WeatherCardWidget) 的視覺單調性，並提升播放系統（如 Kiosk）的 FHD 視覺質感，加入天氣狀態圖示、微型 Grid 圓角底板以及優化氣溫文字排版。

## What Changes

- 在天氣卡 header 中，根據 `weather.condition` 動態顯示合適的天氣 SVG 圖標（如太陽、雲朵、雨滴等）。
- 優化溫度數值與單位的排版層次（溫度數值特粗、`°C` 輕量化）。
- 將下方的濕度、風速、雨量 3 個指標從簡單的線條分割優化為獨立的微型圓角底板，並加入小標示（滴水、風速、雨量圖標）。
- 優化無資料時的加載樣式，以淡色骨架屏 (Skeleton) 替代「天氣資料尚未就緒」的純文字。
- **不使用滑鼠懸停 (hover) 互動**，確保適合無滑鼠播放系統。

## Non-Goals

- 不在天氣卡上引入任何 hover 互動特效。
- 不調整 Server API、SQLite 資料庫結構與 MQTT 傳輸架構。

## Capabilities

### New Capabilities

- `overview-weather-card-polish`: 定義天氣卡的天氣 Icon 渲染規則、指標 Grid 卡片化與骨架屏樣式規格。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `overview-weather-card-polish`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx`
    - `apps/web/src/pages/Overview/overview.css`
