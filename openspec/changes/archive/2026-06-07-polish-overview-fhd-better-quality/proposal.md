## Summary

把 Overview 播放頁的視覺質感從目前的扁平淺色卡片，收斂到 `docs/reference/Better/01.Overivew (大).png` 的精緻度，維持既有淺色 FHD canon，不改深淺主題。

## Motivation

現況 Overview 雖已具備 hero、KPI 卡、天氣／三相電力／趨勢三個 density widget，但視覺質感明顯低於可交付水準：hero 圖縮在右上角、中段大片留白、卡片扁平實心、資料排版鬆散、整體未鋪滿。對照 Better 參考圖，差距集中在 hero 張力、卡片 frosted glass 質感、資料排版層次與滿版節奏四個面向，與深淺色系無關。

## Proposed Solution

僅調整 Overview-scoped 的樣式與 layout 座標，分四面向收斂：

- **Hero 重排**：放大 hero 照片容器、調整與雙語 eyebrow/title/subtitle 的疊合與留白，收掉中段空白；透過既有 hero typography token 與 `heroContainer`/`heroCopyLayout` 座標達成。
- **Frosted glass 卡片**：在 Overview-scoped class（`.overview-kpi-card`、`.overview-dashboard-widget` 及其 widget 子類）加入半透明背景、細邊框、柔光陰影與一致圓角，不改共用 `displayPageCards.tsx`/`displayPageCards.css` base，避免溢出其他四頁。
- **資料排版精緻化**：調整 KPI 卡與三個 density widget 內數字／單位／標籤的字級層次與間距，使數據主視覺更突出。
- **滿版節奏重排**：重排 hero → 第二排 density widget → KPI 卡列的垂直座標與卡片高度，使三段節奏均勻、邊到邊呼吸感一致。

## Non-Goals

- 不改深淺色系；維持淺色 FHD canon，不引入深色主題。
- 不改共用 card component（`displayPageCards.tsx`/`displayPageCards.css`）base 樣式，避免影響 Solar/Factory Circuit/Images/Sustainability 四頁。
- 不碰 nav/route、server API、SQLite、MQTT、region tree、publish workflow。
- 不新增 widget 或資料來源；本 change 純視覺收尾。
- 不用 page-local hardcode 繞過 editor；座標與顯示仍由既有 config/seed 表達。

## Alternatives Considered

- 改共用 card component base 一次套五頁：被否決，因其餘四頁 FHD 參考圖節奏不同，會造成回歸風險，且超出本輪 Overview-only scope。
- 全面深色玻璃主題：被否決，與淺色 FHD canon 衝突，且澄清後確認 Better 本身即淺色基底。

## Impact

- Affected specs: `overview-fhd-better-quality`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/layout.ts
    - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
    - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
    - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
