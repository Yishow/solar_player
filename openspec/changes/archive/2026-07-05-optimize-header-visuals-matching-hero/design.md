## Context

為了提升播放端頁面（Playback）的視覺一致性，我們需要優化 AppHeader 的樣式，使其融入 Overview 頁面中 Hero Section 的設計美學，包括字體陰影、強調色彩和精緻的金線分割線。

## Goals / Non-Goals

**Goals:**

- 為 Header 品牌及系統標題套用適當的文字陰影（`text-shadow`）。
- 為關鍵字「綠能」套用 `var(--display-emphasis-green)` 強調色。
- 為時鐘區數字引進微弱的綠色/金色 Glow 發光效果。
- 將下方分割線替換為與 KPI 卡片相同的金色漸層分割線（`--display-ornament-gold-strong`）。
- 為天氣太陽 SVG 圖示加入微幅慢速旋轉與呼吸微動畫效果。
- 調整時鐘區的日期與星期顏色為 `var(--shell-kicker-muted)`，強化與時鐘發光數字的視覺對比。
- 為右側天氣文字與連線狀態標籤套用極輕微、發散的軟陰影（方案 A），避免邊緣髒感並保持精緻視覺。

**Non-Goals:**

- 不修改 Header 的 HTML 排版佈局、圖標來源、MQTT 連線狀態與天氣資料同步的邏輯。
- 不調整 Header 的高度、Z-Index 及其他頁面的結構。

## Decisions

### Decision: 在 CSS 中統一管理 Header 的 Hero 語彙樣式

我們將在 `global.css` 中，為 `.shell-header-bar` 與其子元素定義相關的文字陰影、Glow 效果與金色漸層分割線，避免在組件中寫死 ad-hoc 樣式。

### Decision: 優化天氣圖示動畫與時鐘資訊層次對比

為了加強播放端頂部的動態質感與易讀性，我們將採用 CSS `@keyframes` 動畫為天氣 SVG 圖示套用慢速旋轉與呼吸呼吸感，並調整時鐘區輔助資訊（日期、星期）的顏色以突顯時間本體。

## Implementation Contract

- **行為**：Header 中的「國瑞汽車 / KUOZUI MOTOR」與「綠能展示系統」會呈現與下方 Hero 標題一致的微弱文字陰影，字體更顯立體；其中「綠能」二字將變為綠色強調色；時鐘顯示的數字在播放時會帶有細緻的金色/綠色發光背景；Header 下方的灰色漸層線會替換為金色漸層分割線；右側天氣文字與連線狀態標籤則套用極輕微、發散的軟陰影（方案 A），以避免邊緣發髒。
- **介面/資料結構**：無行為邏輯或 API 資料格式修改。
- **失敗模式**：在極少數不支援 `text-shadow` 或 `filter: drop-shadow` 的舊瀏覽器中，應優雅降級為無陰影與無發光文字，但不影響排版與易讀性。
- **驗收標準**：
  - 手動驗證播放端的 Header 標題具有 `text-shadow` 與發光樣式。
  - 下方分割線呈現金色漸層。
  - 跑通 `pnpm test` 確保沒有 Regression。
- **範圍邊界**：僅修改播放端 Header 相關的 CSS 與 React 組件，不影響 Management 端的 Shell。

## Risks / Trade-offs

[Risk] → 如果陰影太深或 Glow 太亮，可能會降低特定背景下的文字易讀性。
Mitigation → 使用與 Hero title 相同的 CSS 變數（如 `var(--display-text-shadow-black-18)` 與微調的光暈半徑），並確保在不同主題背景下進行對比度測試。
