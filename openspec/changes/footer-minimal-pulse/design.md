## Context

為了提升 Raspberry Pi 5 驅動之中廊展示系統（大螢幕自動播放無人值守看板）在遠距離觀看時的精緻度與專業科技美學，我們需要替換現有 Playback Footer 中手繪感、複雜且偏暗的迷你葉子與樹枝裝飾，並優化導航圖標的對比度。

## Goals / Non-Goals

**Goals:**
- 將 Playback Footer 左側迷你葉子替換為極簡的幾何折線太陽圖章 ( Geometric Sun Badge )。
- 將 Playback Footer 右側搖擺樹枝替換為能量脈衝線 ( Energy Pulse Line )，具有橫向滑過的發光點。
- 將 Playback Footer 的導航圖標線條加粗，並為 Active 項目新增亮綠與金色底線，以及呼吸燈明滅發光效果。
- 嚴格遵守既有 CSS 測試約束（維持 72px 高度、不使用 `backdrop-filter`、不使用 `::before`、漸層頂邊線寬度維持 90%）。

**Non-Goals:**
- 不改變任何路由結構與播放導航邏輯。
- 不影響 Management 模式的 Footer 外觀。

## Decisions

### 1. 替換 LeafOrnament 為 Geometric Sun Badge
- **做法**：在 [AppFooterNav.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/components/AppFooterNav.tsx) 的 playback 分支下，將 `<LeafOrnament variant="footer-mini" />` 替換為全新的 `<GeometricSunBadge />` 元件。該元件由細緻幾何折面線條構成 SVG 太陽，低調且高雅。
- **替代方案**：保留原本的 LeafOrnament。但它在大螢幕上遠觀容易顯得精緻度不足。

### 2. 替換 FooterBranch 為 Energy Pulse Line
- **做法**：將原本手繪風的 SVG 枝條 `<FooterBranch />` 替換為 `<EnergyPulseLine />`。繪製一條細水平線，並利用 CSS `@keyframes pulse-slide` 讓一顆發光的圓點（能量脈衝）每隔 4 秒從左滑到右，象徵綠能電流。
- **替代方案**：使用靜態直線。但靜態線條缺乏「流動」的科技氛圍。

### 3. 優化導航圖標 (Icon) 對比度與呼吸發光效果
- **做法**：
  - 在 `PlaybackNavIcon` 中將 SVG 的 `strokeWidth` 由 `1.65` 改為 `2.0`（僅在 playback 模式）。
  - 對 Active 項目，文字與圖標的顏色套用亮綠色，並透過 CSS 類別 `.animate-pulse-opacity` 控制其不透明度在 0.75 到 1.0 之間平滑呼吸變化，底線採用 `#d4af37` (金色)。

## Implementation Contract

- **用戶端行為**：大螢幕看板的 Footer 兩側將由原本靜態/手繪感的葉子與樹枝，變為極簡幾何太陽與動態發光脈衝線。選單 icon 粗度提升，Active 項目會呈現亮綠色與金色底線，並以呼吸燈效果緩緩閃爍。
- **介面/代碼邊界**：
  - 所有新動效在 [global.css](file:///Users/yishow/prj/solar_player/apps/web/src/styles/global.css) 中定義為 CSS class。
  - 所有改動局限在 [AppFooterNav.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/components/AppFooterNav.tsx) 中對 `mode === "playback"` 的渲染分支與圖標 SVG 定義。
- **驗證標準**：
  - 跑 `pnpm test` 確保 `tokens.test.ts` 與 `AppFooterNav.icons.test.tsx` 均綠燈。
  - 啟動 Vite Dev 伺服器並手動確認 Playback Footer 兩側的動態裝飾，Active 的 item 有呼吸閃爍。

## Risks / Trade-offs

- **[Risk]** 動畫在 Raspi 5 上可能造成 GPU 負擔 → **[Mitigation]** 僅使用極為簡單的 CSS 屬性 (如 `transform: translateX` 與 `opacity`) 進行動畫，確保性能流暢。
