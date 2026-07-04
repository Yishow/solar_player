## Summary

優化與美化 Overview 頁面的天氣卡片，提升視覺吸引力與資訊層次感，並加入氣候感應式背景。

## Motivation

目前的天氣卡片（WeatherCardWidget）外觀較為單一，且不論氣候如何均呈現相同的綠色調，缺乏活潑的視覺氛圍。此外，Emoji 與手寫線條的 SVG 圖示在 FHD 高解析度大屏顯示上精緻度不足，字體層次亦有優化空間。本變更旨在實作氣候感應背景、毛玻璃氛圍、精緻的雙層 SVG 天氣圖示及指標細節優化，進一步契合 Rule 中對「vibrant colors, glassmorphism, premium feel」的網頁設計美學要求。

## Proposed Solution

1. **氣候感應背景與毛玻璃氛圍**：依據當前天氣狀態（晴、雨、雲、預設）在 `DisplayCardFrame` 加上對應的天氣樣式類別（如 `.weather-sunny`、`.weather-rainy` 等），並在 `overview.css` 實作氣候感的漸層與毛玻璃效果。
2. **多層次 SVG 動態圖示**：重新設計 `WeatherCardWidget.tsx` 的 `renderWeatherIcon`，使用雙層或多色渐變 SVG。優化圖示排版避免與標題重疊。
3. **數據指標晶片（Detail Chips）優化**：替換 `💧`、`💨`、`🌧️` 等 Emoji 為極簡 SVG 線條圖示。
4. **資訊層次優化**：調整地區名稱與觀測時間（`observedAt`）的排版位置與字體大小。

## Non-Goals (optional)

- 不調整天氣資料的 API 獲取邏輯。
- 不改變天氣資料的 SQLite / MQTT 快取或同步架構。

## Impact

- Affected specs: 
  - `overview-weather-card-polish`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
    - apps/web/src/pages/Overview/overview.css
