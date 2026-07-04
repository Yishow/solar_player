## Context

當前 `/overview` 頁面的天氣卡 (WeatherCardWidget) 在資料展示上過於扁平，且「天氣資料尚未就緒」的加載狀態不夠精美。作為展示 kiosk 系統，需要在無滑鼠 hover 的前提下，提升卡片自身的精緻度與層次感。

## Goals / Non-Goals

**Goals:**
- 在天氣卡 header 引入與當前天氣相符的 SVG 圖標。
- 將氣溫的「數值」與「單位」分拆渲染，以特粗字重凸顯氣溫。
- 將底部的三個指標（濕度、風速、雨量）以 rounded card chips（圓角底板）排版，增加資訊區塊感。
- 將加載狀態替換為精緻的骨架屏（Skeleton Loader）。

**Non-Goals:**
- 不為天氣卡加入滑鼠懸停 (hover) 上浮或陰影變化的 CSS transitions，以維持播放系統的畫面穩定性。
- 不引入外部大重型 Icon 套件。

## Decisions

### Decision 1: 天氣 SVG 圖標動態分流與 header 整合
- **方案**：在 `WeatherCardWidget.tsx` 中建立一個簡單的圖標路由函式，依據 `weather.condition` 是否包含「雨」、「晴」、「多雲」或「陰」等關鍵字，回傳對應的 inline SVG 圖標（太陽、雲朵、雨滴、預設天氣圖標）。將其傳入 `DisplayCardHeader` 的 `icon` 屬性。
- **理由**：直接使用內聯 SVG 可以完全控制圖標顏色、大小與縮放，且不需引進任何 npm 依賴，符合 KISS 原則。

### Decision 2: 氣溫數值與單位分離渲染
- **方案**：使用 Regex 或字串操作，將原本的 `28°C` 字串拆分成 `28` 與 `°C` 兩部分。在 React 中將它們渲染為獨立的 `<span>`（例如 `.weather-temp-num` 與 `.weather-temp-unit`）。
- **理由**：能夠精細控制氣溫數字（特粗、大字級，`font-weight: 800`）與單位（輕量、小字級，`font-weight: 400`）的視覺對比，提升現代儀表板的美感。

### Decision 5: GPU 加速的天氣圖示與指標 Chips 微動畫
- **方案**：在 `overview.css` 中，為 SVG 天氣圖示與 3 個指標 chips 加上對 Raspberry Pi 5 極度友善的 GPU 硬體加速動畫：
  - **太陽自轉**：套用緩慢的 `transform: rotate(360deg)` 旋轉動畫，週期設為 40s。
  - **雲朵漂浮**：套用極微幅的 `transform: translateX(-1.5px)` 至 `1.5px` 漂浮動畫。
  - **雨滴降落**：為 SVG 中的雨滴路徑套用 `stroke-dashoffset` 動畫（使用 `stroke-dashoffset: -8` 偏移），實現降雨動感。
  - **指標交錯入場**：對 `.overview-weather-indicator-chip` 使用 staggered transition（使用 `animation-delay` 交錯 0.1s），從 `opacity: 0` 加上 `transform: translateY(8px)` 平滑淡入歸位。
  - **微型流光呼吸**：在 indicator chip 的 `::before` 擬元素中加入 radial-gradient，並套用 `opacity` 呼吸動畫（0.15 至 0.45 漸變），為磨砂底板提供微弱的動態流光感。
- **理由**：這些屬性（`transform`、`opacity`、`stroke-dashoffset`）皆由 GPU 硬體合成，完全不會觸發瀏覽器的 Layout Reflow 與 Repaint，保證在 Raspberry Pi 5 上的 60fps 流暢渲染。

### Decision 3: 指標卡片化與輔助圖標設計
- **方案**：在 `overview.css` 中將 `.overview-weather-indicators` 內的每一個指標改寫為帶有圓角 `border-radius: 12px`、極細白色邊框及淡色毛玻璃背景（`rgba(98, 117, 78, 0.05)`）的獨立 chip 容器。並在指標 Label 旁加入 Unicode 符號（💧 濕度, 💨 風速, 🌧️ 雨量）以增強辨識度。
- **理由**：相較於原本的一條 border 線，卡片化能使卡片下方的三個數值資訊區隔更加顯著與高級。

### Decision 4: 輕量骨架屏取代純文字加載狀態
- **方案**：當 `weather.available` 為 false 時，渲染一個 `.overview-weather-skeleton` 排版。內含一個代表溫度的圓角方塊與三個代表指標的圓角方塊，套用 `@keyframes overviewSkeletonShimmer` 的 opacity 漸變動畫。
- **理由**：骨架屏能在數據未載入前維持穩定的版面結構，相較於「天氣資料尚未就緒」的單行文字更具備 FHD Display 的高級感。

## Implementation Contract

**觀察行為 (Behavior)**
- 進入 `/overview` 時，天氣卡標題旁會出現對應天氣狀態（晴、雨、多雲等）的 SVG 圖標。
- 氣溫大字使用特粗字體，`°C` 則小巧地靠在右上角。
- 下方的濕度、風速、雨量呈現出 3 個水平排列的精美圓角底板。
- 資料加載前，天氣卡會展示帶有呼吸光效果的骨架屏方塊，而非單純的文字提示。
- 滑鼠移入天氣卡時，天氣卡保持靜態，不發生上浮或變形。

**驗收標準 (Acceptance Criteria)**
- 控制台無報錯，單元測試全數通過。
- 透過 `pnpm run fhd:witness` 進行截圖，人工檢查天氣卡的 SVG 圖標、大溫度文字、指標 chips 以及骨架屏（若可模擬）均顯示精美且無重疊。

**範圍邊界 (Scope Boundaries)**
- 僅修改 `WeatherCardWidget.tsx` 與 `overview.css`，其他頁面無任何樣式受影響。
