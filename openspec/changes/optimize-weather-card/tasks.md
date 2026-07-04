## 1. 結構與邏輯修改 (WeatherCardWidget.tsx)

- [x] 1.1 實作 `Decision 1: CSS-driven Weather Responsive Themes` 及 `Overview weather card responsive themes`，在 `WeatherCardWidget.tsx` 的容器上根據 `weather.condition` 動態傳入天氣類別（如 `weather-sunny`、`weather-rainy`、`weather-cloudy`），並透過執行單元測試 `pnpm test apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx` 驗證其渲染的 DOM 類別正確。
- [x] 1.2 實作 `Decision 2: Multilayered and Colored SVG Weather Glyphs` 及 `Overview weather card icon rendering`，在 `WeatherCardWidget.tsx` 的 `renderWeatherIcon` 函式中，重新設計多色分層（如包含 `linearGradient`、前後重疊雲雨結構）的 SVG 代替原本單色線條 SVG，並於瀏覽器或測試環境中手動審查圖示能對應晴、雨、多雲等條件正確渲染。
- [x] 1.3 實作 `Decision 3: Replacing System Emojis with Custom Vector Icons` 及 `Overview weather card grid indicators`，將 `WeatherCardWidget.tsx` 底部三個指標晶片的 Emoji（`💧`、`💨`、`🌧️`）替換成極簡的向量 SVG 圖示，並透過 `pnpm test apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx` 驗證 Emoji 均已被移除且 SVG 順利渲染。
- [x] 1.4 實作 `Decision 4: Layout and Typography Adjustments for Better Readability` 及 `Overview weather card temperature typography`，調整 `WeatherCardWidget.tsx` 的 DOM 結構，將 location 與 observedLabel 從原本的右半部位置移至大字溫度（overview-weather-temperature）的下方，建立清爽的層次，並透過單元測試確保 location 與 observedLabel 的節點仍然正確渲染。

## 2. 樣式與動畫實作 (overview.css)

- [x] 2.1 實作 `Decision 1: CSS-driven Weather Responsive Themes` 在樣式檔上的對應，於 `overview.css` 針對 `.weather-sunny`、`.weather-rainy` 及 `.weather-cloudy` 設定氣候感應的背景漸層、發光陰影（`box-shadow`）與毛玻璃效果，並在瀏覽器中手動 assertions 卡片外觀色彩與主題的一致性。
- [x] 2.2 實作 `Decision 2: Multilayered and Colored SVG Weather Glyphs` 在樣式檔上的動畫，於 `overview.css` 優化晴天（旋轉）、多雲（漂移）及雨天（錯落雨滴）的 GPU 加速 CSS 動畫（使用 `opacity` 與 `transform`），並透過 content review 檢查動畫運作順暢無卡頓。
- [x] 2.3 實作 `Decision 3: Replacing System Emojis with Custom Vector Icons` 的樣式，於 `overview.css` 設定指標晶片的微發光、毛玻璃背景以及懸停（hover）時的輕微上移（`translateY`）與發光效果，以單元測試及視覺檢視確保樣式正確套用。
- [x] 2.4 實作 `Decision 4: Layout and Typography Adjustments for Better Readability` 的排版，於 `overview.css` 調整大字溫度的 `letter-spacing` 與字重，並為其下方的 metadata 資訊設定 `13px - 14px` 的小字與中性色調，以手動審查確認整體排版無任何重疊或跑版。
- [x] 2.5 執行 FHD witness 測試（`pnpm run fhd:witness`）對照設計規範，確認天氣卡片在 FHD 規格下視覺顯示完美、動畫符合預期且無 regressions，最終驗證測試套件全部綠燈。
