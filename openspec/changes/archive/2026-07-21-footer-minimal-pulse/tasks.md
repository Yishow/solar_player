## 1. 實作左側幾何太陽圖章

- [x] 1.1 實作 Requirement `Playback footer left ornament provides geometric sun badge` 與 Design `1. 替換 LeafOrnament 為 Geometric Sun Badge`：在 `apps/web/src/components/AppFooterNav.tsx` 中建立一個極簡幾何太陽儀表 `GeometricSunBadge` 並取代 `LeafOrnament`，使其外觀由細緻幾何折角線條構成。
  - **驗證方式**：在 Vite Dev 預覽中手動檢視 Playback Footer 左側是否正確呈現極簡幾何折線太陽，且 `pnpm test` 的單元測試保持綠燈。

## 2. 實作右側動態能量脈衝線

- [x] 2.1 實作 Requirement `Playback footer right ornament provides dynamic energy pulse line` 與 Design `2. 替換 FooterBranch 為 Energy Pulse Line`：將原本手繪風 SVG 枝葉的 `FooterBranch` 替換為 `EnergyPulseLine` 水平細線，並透過 CSS 動畫使發光粒子由左向右滑過。
  - **驗證方式**：確認右側裝飾物呈現一條細線且有小圓點橫向移動，且 `pnpm test` 無任何斷言失敗。

## 3. 優化導航圖標與呼吸發光效果

- [x] 3.1 實作 Requirement `Playback footer navigation route icons render with enhanced contrast and pulse fade` 與 Design `3. 優化導航圖標 (Icon) 對比度與呼吸發光效果`：在 `AppFooterNav.tsx` 中將 Playback 模式下圖標的 `strokeWidth` 提升至 2.0，並為 Active 導航項目套用高對比的亮綠色與金色底線，以及不透明度介於 0.75 到 1.0 之間漸變的呼吸燈發光 (Glow) 效果。
  - **驗證方式**：於大螢幕預覽中確認 Active 項目的 Icon 明顯加粗，其文字和圖標具備呼吸燈明滅對比，並確保 `pnpm test` 中受約束的 CSS 變數無任何斷言失敗。
