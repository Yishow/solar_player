## 1. 實作左側太陽能發電核心幾何儀表

- [x] 1.1 實作 Requirement `Playback footer left ornament provides digital status gauge` 與 Design `1. 替換 LeafOrnament 為 Rotating Solar Gauge`：在 `apps/web/src/components/AppFooterNav.tsx` 中建立一個幾何太陽能儀表 `RotatingSolarGauge` 並取代 `LeafOrnament`，使其外環能以慢速旋轉、內圈小點有呼吸發光效果。
  - **驗證方式**：在 Vite Dev 預覽中手動檢視 Playback Footer 左側是否正確呈現細膩旋轉的同心幾何圓環，且 `pnpm test` 的單元測試保持綠燈。

## 2. 實作右側動態幾何數據波線

- [x] 2.1 實作 Requirement `Playback footer right ornament provides data stream wave decoration` 與 Design `2. 替換 FooterBranch 為 Dynamic Data Wave Line`：將原本手繪風 SVG 枝葉的 `FooterBranch` 替換為以 SVG path 繪製的幾何數據波形，並附帶 `SYS ACTIVE // RPI-5` 標示字樣。
  - **驗證方式**：在瀏覽器中確認原本右側的樹枝已被幾何波浪與 Pi 5 狀態文字取代，且排版結構與 slogan 文字在 FHD (1920x1080) 大螢幕下對齊。

## 3. 優化導航圖標與發光效果

- [x] 3.1 實作 Requirement `Playback footer navigation route icons render with enhanced contrast and glow` 與 Design `3. 優力導航圖標 (Icon) 對比度與發光效果`：在 `AppFooterNav.tsx` 中將 Playback 模式下圖標的 `strokeWidth` 提升至 2.0，並為 Active 導航項目套用高對比的亮綠/金色雙色調，以及利用 `text-shadow` 實現的呼吸發光 (Glow) 效果。
  - **驗證方式**：於大螢幕預覽中確認 Active 項目的 Icon 明顯加粗，其文字和圖標具備金色與亮綠色的高亮對比與呼吸發光外觀，並確保 `pnpm test` 中受約束的 CSS 變數無任何斷言失敗。
