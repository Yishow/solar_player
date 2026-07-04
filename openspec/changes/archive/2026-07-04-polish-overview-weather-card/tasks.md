## 1. 天氣卡 React 元件重構 (Component Refactor)

- [x] 1.1 執行 [Decision 1: 天氣 SVG 圖標動態分流與 header 整合]，在 `WeatherCardWidget.tsx` 中編寫內聯 SVG 天氣圖標路由（晴、雨、多雲、陰等），並將其帶入 `DisplayCardHeader` 的 `icon` 屬性，實作 [Overview weather card icon rendering] 需求。驗證方式：藉由單元測試檢測元件渲染時，根據不同 condition 正確帶入 SVG 圖案。
- [x] 1.2 執行 [Decision 2: 氣溫數值與單位分離渲染]，在 `WeatherCardWidget.tsx` 中解析溫度字串並分離數值與 `°C` 單元單獨渲染，實作 [Overview weather card temperature typography]。驗證方式：確認氣溫數值與單位分別渲染於帶有不同 CSS class 的 span 元素內。
- [x] 1.3 執行 [Decision 3: 指標卡片化與輔助圖標設計]，在 `WeatherCardWidget.tsx` 中為濕度、風速、雨量加上對應 Unicode 圖標（💧, 💨, 🌧️）並將其與氣溫排版整合成新的 Micro-Grid 結構，實作 [Overview weather card grid indicators]。驗證方式：檢視程式碼結構確認指標 Label 已加入小圖案。

## 2. 天氣卡樣式美化與無資料狀態 (CSS & Fallback Polish)

- [x] 2.1 修改 `apps/web/src/pages/Overview/overview.css`，微調天氣卡的溫度與單位字型字重（數值為 800，單位為 400 且字級縮小），並將下方的 3 個指標區塊設定為帶有圓角 `12px`、極細白色邊框及淡色毛玻璃背景的獨立 chip 容器，以實現 [Overview weather card temperature typography] 與 [Overview weather card grid indicators]。驗證方式：運行 `pnpm run fhd:witness` 檢查生成的截圖，確保氣溫字級對比與下方 chips 的間距與美感。
- [x] 2.2 執行 [Decision 4: 輕量骨架屏取代純文字加載狀態]，修改 `WeatherCardWidget.tsx` 與 `overview.css`。當資料不可用時渲染由圓角方塊組成的骨架屏，並套用 shimmer 不透明度呼吸動畫，滿足 [Overview weather card load state skeleton]。驗證方式：模擬 `weather.available = false` 的加載狀態，人工確認顯示出 pulsing 呼吸的骨架屏。
- [x] 2.3 確保在 `overview.css` 中，不為天氣卡 `.overview-weather-widget` 套用任何 hover transitions（例如上浮 translateY 或是陰影擴大），滿足 [No hover effects on weather card]。驗證方式：將滑鼠移入天氣卡，確認其完全保持靜態無 any 動態偏移。
- [x] 2.4 執行 [Decision 5: GPU 加速的天氣圖示與指標 Chips 微動畫]，在 `WeatherCardWidget.tsx` 中為雨滴 SVG 加上對應的 class（`overview-weather-rain-drop`），並在 `overview.css` 中實作太陽自轉、雲朵左右微幅飄移、雨滴 stroke-dashoffset 滾動、以及 chips 圓角底板的 staggered 漸入與 `::before` 流光呼吸燈動畫，滿足 [Overview weather card icon rendering] 與 [Overview weather card grid indicators]。驗證方式：人工在網頁中檢視各項動畫運作順暢，確認動畫屬性僅使用 GPU 硬件加速的 transform/opacity 相關屬性以適應 Raspberry Pi 5 性能。
