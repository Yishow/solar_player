## Context

當前 Overview 頁面的天氣卡片採用單一 info 卡片底色，且圖示為單色手寫 SVG，指標使用系統 Emoji，在 FHD 高解析度大屏播放器中精緻度不足。本設計旨在透過 CSS 與 SVG 的現代美化，提供更高端的視覺體驗。

## Goals / Non-Goals

**Goals:**

- 實作氣候感應的主題背景漸層與微弱發光陰影。
- 重新設計多色分層的天氣 SVG 圖示並引入平滑的 GPU 動畫。
- 以客製化輕量向量 SVG 圖示替換數據指標（濕度、風速、雨量）中的 Emoji。
- 重整資訊排版層次，改善大尺寸下的擁擠感。

**Non-Goals:**

- 不修改天氣資料獲取的 API。
- 不修改後端 SQLite 快取或 MQTT 訊息發送邏輯。

## Decisions

### Decision 1: CSS-driven Weather Responsive Themes

不使用 JavaScript inline style 來處理動態背景，而是將 `weather.condition` 映射至對應的 CSS class（如 `.weather-sunny`, `.weather-rainy`, `.weather-cloudy`）。
- **理由**：提高樣式與邏輯的解耦度，便於在 CSS 中直接利用變數（CSS variables）定義色彩漸層與 `box-shadow`。
- **替代方案**：使用 JS `style` 動態設定背景漸層，但會增加 React render 負擔，且不便於利用 CSS 動畫與偽元素進行優雅的漸層轉場。

### Decision 2: Multilayered and Colored SVG Weather Glyphs

重新設計 `WeatherCardWidget.tsx` 的內部 SVG，改用包含漸層（`<linearGradient>`）的多色分層 SVG。
- **理由**：單色線條在高畫質顯示下過於簡陋。多色漸層與前後重疊的雲雨層能大幅提升 premium 質感。
- **替代方案**：使用外部圖片，但會增加額外的網路請求或打包體積，且不便於使用 CSS 控制個別 SVG 路徑的動畫。

### Decision 3: Replacing System Emojis with Custom Vector Icons

底部的三個指標（濕度、風速、雨量）以極簡的細線（stroke-width 2）SVG 圖示取代 `💧`、`💨`、`🌧️` 等系統 Emoji。
- **理由**：系統 Emoji 的外觀在不同瀏覽器與作業系統（macOS vs Windows vs Linux 嵌入式螢幕）下表現不一且風格不搭。客製化 SVG 能保證完全一致且高質感的渲染成果。

### Decision 4: Layout and Typography Adjustments for Better Readability

將地區名稱與觀測時間（observedLabel）從右上角或靠右側移至左下角（位於大字溫度下方），並使用 `13px - 14px` 的小字與中性色調呈現。
- **理由**：這樣能清空右上角，將大圖示擺放在醒目位置，且字體分層更加清晰，避免溫度大字與時間地區搶奪視覺焦點。

## Implementation Contract

- **行為 (Behavior)**：天氣卡會根據當前氣候狀態（晴/雨/雲）自動變換相應的主題渐層背景。卡片渲染精美多色的動態 SVG，底部指標採用一致風格的向量圖示，排版符合高級大屏顯示要求。
- **資料格式 (Data Shape)**：維持現有的 `OverviewWeatherViewModel`。
- **失敗模式與降級 (Fallback)**：若氣候狀態為空、未知或 skeleton 狀態，卡片降級使用預設的自然綠色漸層，且圖示降級為精簡溫度計圖示。
- **驗證標準 (Acceptance Criteria)**：
  - 當天氣狀況為「晴」時，卡片容器帶有 `.weather-sunny` 類別，呈現溫暖金黃色漸層。
  - 當天氣狀況為「雨」時，卡片容器帶有 `.weather-rainy` 類別，呈現冷色調藍灰色漸層。
  - 當天氣狀況為「雲」或「陰」時，卡片容器帶有 `.weather-cloudy` 類別，呈現銀灰色漸層。
  - 所有指標晶片內的 Emoji 均被替換為對應的 SVG 圖示。
  - 地區與時間資訊正確排版於溫度下方，字距與大小調整完畢。
  - FHD witness 驗證腳本跑綠燈。
- **範疇邊界 (Scope Boundaries)**：
  - **在範疇內**：修改 `WeatherCardWidget.tsx` 與 `overview.css`。
  - **超出範疇**：更改 UI 以外的任何邏輯、修改其他 Dashboard Widgets。

## Risks / Trade-offs

- **[Risk] CSS 漸層在大尺寸螢幕下渲染可能產生 banding（色彩斷層）**
  - **Mitigation**：使用色彩過渡較為柔和的雙色漸層，避免對比度過高，並利用毛玻璃遮罩（backdrop-filter）進行視覺上的平滑化。
