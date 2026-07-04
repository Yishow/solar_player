## Why

為了解決 `/overview` 頁面在 1920x1080 FHD 解析度下，底部 5 張 KPI 卡片高度、間距排版的不均勻感，並提升磨砂玻璃 (Frosted Glass) 視覺品質與滑鼠懸停 (Hover) 微互動效果，使其符合設計美學，同時避免卡片排版與上方 Hero 區塊、下方 widgets 產生重疊。

## What Changes

- 校準 5 張 KPI 卡片在 1920x1080 底下的 `left` 和 `width` 佈局定位，確保間距均匀對稱。
- 微調 `overview.css` 中的 `overview-kpi-card` 樣式，使毛玻璃效果（backdrop-filter blur、border、background gradient）更具通透感與高級感。
- 為 `overview-kpi-card` 新增滑鼠懸停 (Hover) 向上微幅浮動與陰影加深的 Transition 微互動動畫。
- 統一 5 張 KPI 卡片的 Icon Shape 預設為 `rounded-square`，並對 CO2 樹木 footer 的指示點加上輕微的呼吸動態感。

## Non-Goals

- 不修改共用的 `DisplayCardFrame` 基礎元件（不影響其他播放頁面）。
- 不調整 Server API、SQLite 資料庫結構或 MQTT 傳輸架構。
- 不引入 Dark Mode 或變更整體的 Light FHD color canon。

## Capabilities

### New Capabilities

- `overview-kpi-card-polish`: 定義 Overview KPI 卡片的高度與間距基準、磨砂玻璃視覺微調、以及 Hover 微互動動態效果。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - `overview-kpi-card-polish`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/overview.css`
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Overview/OverviewKpiFooter.tsx`
