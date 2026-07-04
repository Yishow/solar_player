## Context

為了提升 Raspberry Pi 5 驅動之中廊展示系統（大螢幕自動播放無人值守看板）在遠距離觀看時的精緻度與專業科技美學，我們需要替換現有 Playback Footer 中手繪感、複雜且偏暗的迷你葉子與樹枝裝飾，並優化導航圖標的對比度。

## Goals / Non-Goals

**Goals:**
- 將 Playback Footer 左側迷你葉子替換為旋轉的太陽能發電核心科技儀表 ( Rotating Solar Gauge )。
- 將 Playback Footer 右側搖擺樹枝替換為動態數據波線 ( Data Wave ) 與運作狀態字樣。
- 將 Playback Footer 的導航圖標線條加粗，並為 Active 項目新增亮綠與金色的雙色調以及霓虹發光效果。
- 嚴格遵守既有 CSS 測試約束（維持 72px 高度、不使用 `backdrop-filter`、不使用 `::before`、漸層頂邊線寬度維持 90%）。

**Non-Goals:**
- 不改變任何路由結構與播放導航邏輯。
- 不影響 Management 模式的 Footer 外觀。

## Decisions

### 1. 替換 LeafOrnament 為 Rotating Solar Gauge
- **做法**：在 [AppFooterNav.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/components/AppFooterNav.tsx) 的 playback 分支下，將 `<LeafOrnament variant="footer-mini" />` 替換為全新的 `<RotatingSolarGauge />` 元件。該元件由同心雙圓環 SVG 組成，外環由點線構成並透過 CSS 動態緩慢旋轉，內圈為一個發光小圓點。
- **替代方案**：使用靜態科技圖示。但靜態圖示缺乏看板的「LIVE」運作感，因此選擇動態幾何圓環。

### 2. 替換 FooterBranch 為 Dynamic Data Wave Line
- **做法**：將原本手繪風的 SVG 枝條 `<FooterBranch />` 替換為 `<DynamicDataWave />`。使用 SVG path 繪製精細的波形圖（象徵數據流或發電波形），下方搭配極小的字體 `SYS ACTIVE // RPI-5`。
- **替代方案**：直接移除右側裝飾。但移除後右側會顯得空曠失去平衡感，因此採用動態幾何數據波線。

### 3. 優力導航圖標 (Icon) 對比度與發光效果
- **做法**：
  - 在 `PlaybackNavIcon` 中將 SVG 的 `strokeWidth` 由 `1.65` 改為 `2.0`（僅在 playback 模式）。
  - 對 Active 項目，文字與圖標的顏色改用金色與亮綠（使用 CSS gradient 或 CSS 變數定義），並透過 `text-shadow` 或 `filter: drop-shadow` 加入一個微小的霓虹發光底襯 (`box-shadow` / `glow`)。

## Implementation Contract

- **用戶端行為**：大螢幕看板的 Footer 兩側將由原本靜態/手繪感的葉子與樹枝，變為緩慢旋轉的科技儀表盤與動態幾何數據波浪。選單 icon 粗度提升，Active 項目會呈現亮綠/金色雙色調且微微發光，容易在遠處辨識。
- **介面/代碼邊界**：
  - 所有新動效在 [global.css](file:///Users/yishow/prj/solar_player/apps/web/src/styles/global.css) 中定義為 CSS class。
  - 所有改動局限在 [AppFooterNav.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/components/AppFooterNav.tsx) 中對 `mode === "playback"` 的渲染分支與圖標 SVG 定義。
- **驗證標準**：
  - 跑 `pnpm test` 確保 `tokens.test.ts` 與 `AppFooterNav.icons.test.tsx` 均綠燈。
  - 啟動 Vite Dev 伺服器並手動確認 Playback Footer 兩側的動態裝飾正常旋轉/起伏，Active 的 item 有發光陰影。

## Risks / Trade-offs

- **[Risk]** 動畫在 Raspi 5 上可能造成 GPU 負擔 → **[Mitigation]** 僅使用極為簡單的 CSS 屬性 (如 `transform: rotate` 與 `opacity`) 進行動畫，不使用複雜的 filter 渲染或 Canvas，確保性能流暢。
- **[Risk]** 變更影響到 `tokens.test.ts` → **[Mitigation]** 絕對不修改 `shell-footer-bar` 的核心 CSS 高度、`backdrop-filter` 以及 `::after` 的 90% 漸層屬性。
