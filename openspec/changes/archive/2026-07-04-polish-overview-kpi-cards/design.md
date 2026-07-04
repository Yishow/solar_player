## Context

當前 `/overview` 頁面底部的 5 張 KPI 卡片在 1920x1080 FHD 解析度下的排版與間距已經由配置與 seed data 基本對齊。然而，在 FHD 收尾（closeout）階段，仍有以下細節可以優化以提升視覺品質：
1. KPI 卡片高度為 188px，與下方 widgets (top=874px) 的垂直間距 (24px) 略顯擁擠，當卡片有 Hover 上浮動態時，需要更多伸展空間。
2. 卡片在毛玻璃質感上不夠通透，且缺乏滑鼠懸停（Hover）微互動。
3. CO2 樹木 footer 中的綠色指示圓點缺乏動態效果。

## Goals / Non-Goals

**Goals:**
- 將 KPI 卡片預設高度微調至 180px，提升垂直空間感。
- 為 KPI 卡片加上平滑的 Hover 懸停微浮動與陰影高亮 Transition。
- 為 CO2 指示點加上精緻的呼吸燈 pulsing 動畫。
- 確保所有樣式變更 scoped 至 `.overview-kpi-card`，不影響其他頁面與共用元件。

**Non-Goals:**
- 不修改共用的 `DisplayCardFrame` 元件。
- 不調整 API、資料庫與 MQTT 架構。

## Decisions

### Decision 1: 微調 KPI 卡片佈局高度以留白與預留 Hover 空間
- **方案**：將 `apps/web/src/pages/Overview/layout.ts` 中的 `overviewKpiLayout` 5 張卡片的高度均由 188px 改為 180px。
- **理由**：減少 8px 的高度可將卡片與下方 widgets 的間距拉大至 32px，在視覺上提供更佳的呼吸感，且為卡片 hover 上浮（translateY(-4px)）提供安全的動態緩衝，避免視覺上的擁擠。

### Decision 2: 於 overview.css 中為 KPI 卡片新增毛玻璃精細化與 Hover 微互動
- **方案**：在 `apps/web/src/pages/Overview/overview.css` 中的 `.overview-kpi-card` 加上 transition 動畫屬性：
  - `transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, border-color 0.3s ease;`
  - 新增 `.overview-kpi-card:hover` 的樣式：
    - `transform: translateY(-4px);`
    - `border-color: rgba(94, 135, 71, 0.35);` (使用主題綠色微光邊框)
    - `box-shadow` 的 shadow strength 增大（可透過陰影擴大來實現高級感）。
- **理由**：不透過 inline styles 動態算 shadow，直接在 CSS 中基於 hover 觸發 transform 和 shadow 動畫，是最簡單（KISS）且效能最佳的實作方式。

### Decision 3: 為 CO2 樹木 equivalent 綠點新增呼吸 pulsing 動畫
- **方案**：在 `overview.css` 中定義 `@keyframes overviewDotPulse`，對指示綠點套用 `animation`，實現柔和的縮放與外發光擴散。
- **理由**：微觀動畫有助於增強整個 FHD 播放介面的活性，且實作簡單，符合 rich aesthetics 理念。

## Implementation Contract

**觀察行為 (Behavior)**
- 進入 `/overview` 時，底部 5 張 KPI 卡片的高度看起來更具均勻的呼吸感。
- 當滑鼠懸停於 5 張卡片的任一張時，該卡片平滑地向上懸浮 4px，邊框亮起為綠色微光，且下方陰影加深。
- CO2 樹木換算的綠色圓點會緩慢進行縮放與外發光呼吸動態。

**驗收標準 (Acceptance Criteria)**
- 頁面加載正常，控制台無報錯。
- 運作 `pnpm run fhd:witness` 進行截圖，觀察 Overview KPI 卡片無重疊且對齊均勻。
- 執行測試 `pnpm test` 或針對 `apps/web/src/pages/Overview/` 的樣式與 layout 測試皆能綠燈通過。

**範圍邊界 (Scope Boundaries)**
- 僅限修改 `/overview` 頁面的相關 CSS、layout 配置與 component 細節，其他 playback 頁面保持原樣。

## Risks / Trade-offs

- [Risk] 調整 layout.ts 的 height 可能導致 operator 在 `/display-pages/editor` 編輯過的 live layout 發生 drift。
- [Mitigation] `resolveOverviewModernDefaultConfig` 中已經對 matches legacy layout 作了 seed 覆蓋。且在 editor 中重新儲存發布即可重置。
