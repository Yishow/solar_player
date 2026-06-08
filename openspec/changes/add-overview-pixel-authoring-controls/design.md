## Context

`/overview` 要對齊 Better 到像素級，卻只有外框（Left/Top/Width/Height）可在 editor 調；card 內部排版與滿版背景大小寫死在 `apps/web/src/pages/Overview/overview.css`、`apps/web/src/components/displayPageCards.css`，背景為 hardcode 的 `.overview-page-background { inset: 0 }`。既有未提交工作已加入 backgroundPool 候選圖池與其 inspector array 欄位（須沿用、勿回退）。Overview 的 per-card 樣式目前透過 `createDisplayCardStyleConfig`（shared `displayCardStyleConfig`）與 `cardStyles` 持有；editor region/field 由 `apps/web/src/pages/Overview/displayPageConfig.ts` 的 region schema 與 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` 渲染。

## Goals / Non-Goals

**Goals:**

- 把 Overview 卡片內部排版（icon 尺寸、中文 label 字級、英文 subtitle 字級、數值字級、卡片內距、sparkline/趨勢區高度、內部對齊）與滿版背景尺寸/位置變成 editor 可調 config。
- runtime 以 inline style／inline CSS 自訂屬性消費 config；stylesheet 只引用變數，不寫死 Better 數值。
- seed 預設與「目前畫面」視覺等價：本 change 不改變現況外觀，只新增可調能力。

**Non-Goals:**

- 不在本 change 設定 Better 的最終像素值（後續於 editor 內存 draft）。
- 不改 server API/DB schema/MQTT；不回退 backgroundPool 工作；不改其他頁與 shared card 對其他頁的外觀。

## Decisions

- **REUSE 既有 `cardStyles`（不重造平行 config）**。盤點後確認 KPI 卡的內部樣式（icon、label、subtitle、value 字級、內距、對齊）**已**由 `apps/web/src/pages/shared/displayCardStyleConfig.ts` 的 `DisplayCardStyleConfig` 提供，並已：runtime 由 `buildDisplayCardStyleVars` 以 inline `--display-card-*` 變數套用（`apps/web/src/pages/Overview/index.tsx` 第 287 行 `createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key])`）、inspector 由 `buildDisplayCardStyleFields` 提供、Overview region schema 以 `path: ["cardStyles", key]` 接上。因此本 change **不**為 KPI 卡新增 `iconSizePx/labelFontSizePx/...` 平行欄位（會與 cardStyles 重複），改為沿用既有 cardStyle 欄位（對應：icon=`iconBoxSize`、label=`titleFontSize`、subtitle=`subtitleFontSize`、value=`valueFontSize`、padding=`paddingTop/Right/Bottom/Left`、align=`valueRowAlign`）。
- **真正新增的能力（既有 cardStyles 未涵蓋）**：
  1. **density widget 樣式**：weather/phasePower/generationTrend/alertNotifications 目前只有 geometry，無樣式 config。為它們新增 `cardStyles` 同型別（`DisplayCardStyleConfig`）的設定，runtime 比照 KPI 卡以 `buildDisplayCardStyleVars` 套用，inspector 以 `buildDisplayCardStyleFields` 接上 region schema。
  2. **`trendHeightPx`（sparkline/趨勢區高度）**：`DisplayCardStyleConfig` 未含。新增 `trendHeight` 欄位（seed=現值 56px）、`buildDisplayCardStyleVars` 輸出 `--display-card-trend-height`、`buildDisplayCardStyleFields` 補對應 number 欄位；`GenerationTrendWidget` 趨勢區改以 `var(--display-card-trend-height, 56px)`。
  3. **`contentAlign` 的 `end`**：現有 `valueRowAlign` 僅 `start|center`。擴為 `start|center|end`（`DisplayCardValueRowAlign` 型別、`displayCardValueRowAlignOptions`、`resolveValueRowAlign`、`DisplayCardValueRow` 對齊樣式）。
  4. **背景版位（背景照片 placement）：已由既有 hero media 能力涵蓋，不新增 `backgroundPlacement`**。盤點後確認 design 原本「背景為 hardcode `.overview-page-background { inset: 0 }` 滿版」的前提已過時——change `align-overview-better-dashboard-closeout` 已提交的 hero 淡出帶 + background pool + media-effect 工作後，背景照片由定位的 `.overview-hero-banner`（`heroContainer` 幾何）渲染，且 placement 三維度皆已可由 editor 編輯：band 高度＝`heroContainer.height`（`overview-hero-media` region geometry）、object-position＝`heroMedia.alignX`/`heroMedia.alignY`（Align X/Y 欄位，runtime 經 `buildDisplayPageMediaPresentation` 套 inline object-position）、底緣淡出＝`heroMedia.effects`（`mediaEffectSurface`，seed 已含 bottom fade layer）。因此本 change 不再新增平行 `backgroundPlacement` config（會與 `heroContainer`/`heroMedia` 重複），改以 guard 測試（`backgroundPlacement.test.ts`）確認既有能力滿足 spec。
- **消費機制：inline CSS 變數**。沿用既有 `buildDisplayCardStyleVars` 的 inline `--display-card-*` 變數模式；density widget 的 trend 高度、padding、radius 改為 `var(--display-card-*, <現值fallback>)` 引用（`.overview-dashboard-widget` 的 `padding`/`border-radius` 與 sparkline 高度），不在 stylesheet 寫死數值。density widget seed（`overviewDensityWidgetStyle`）的 padding=20/24、radius=22 對齊現行 `.overview-dashboard-widget`，確保 seed 等價。
- **editor 欄位**：沿用既有 typed inspector field 與 region schema 模式（number/select），不新增自訂控制元件型別。
- **seed 等價**：所有新欄位 seed 預設＝目前實際值（density widget cardStyle＝現行 widget 視覺、trendHeight=56px、背景 `inset:0` 等價於 heightPercent=100、fadeStartPercent=100 即無淡出），確保「未設定 draft 前畫面不變」。

## Implementation Contract

**Behavior（可觀察結果）：**

- `/display-pages/editor` 選 Overview 後，每張 KPI 卡與每個 density widget 的 inspector 出現「內部樣式」欄位：icon 尺寸、label 字級、subtitle 字級、數值字級、內距、sparkline/趨勢高度、內部對齊；改值並存 draft 後，`/overview`（draft 預覽）即時反映。
- Overview 出現「背景版位」欄位：band 高度（百分比）、object-position X/Y、底緣淡出起點；改值套用到滿版背景的 inline style。
- 未設定任何新欄位時，`/overview` 外觀與本 change 前完全相同（seed 等價）。

**Interface / data shape：**

- KPI 卡內部樣式：沿用既有 `cardStyles[key]`（`DisplayCardStyleConfig`），不新增平行欄位。對應欄位：`iconBoxSize`、`titleFontSize`、`subtitleFontSize`、`valueFontSize`、`paddingTop/Right/Bottom/Left`、`valueRowAlign`。
- density widget 內部樣式：Overview config 新增 `widgetStyles`（key＝weather/phasePower/generationTrend/alertNotifications），型別＝既有 `DisplayCardStyleConfig`，sed 等價現行 widget 視覺。
- `DisplayCardStyleConfig` 擴充：新增 `trendHeight`（number，seed 56），`buildDisplayCardStyleVars` 輸出 `--display-card-trend-height`，`buildDisplayCardStyleFields` 補對應欄位；`valueRowAlign` 擴為 `start|center|end`。
- Overview config 新增 `backgroundPlacement`：`heightPercent`（0–100，seed 100）、`objectPositionX`（0–1，seed 0.5）、`objectPositionY`（0–1，seed 0.5）、`fadeStartPercent`（0–100，seed 100＝無淡出）。
- runtime 在 `apps/web/src/pages/Overview/index.tsx`：density widget 比照 KPI 卡以 `buildDisplayCardStyleVars(widgetStyles[key])` 套 inline 變數；背景以 inline style 套 `backgroundPlacement`（band 高度、object-position、底緣淡出遮罩），取代 hardcode 的 `.overview-page-background { inset: 0 }`。

**Failure modes：**

- 缺欄位或非法值 → 套用 seed 預設（現況值），不丟例外、不出現空白卡。
- `fadeStartPercent >= 100` → 不淡出（等價現況）；`heightPercent=100` → 滿版（等價現況 `inset:0`）。

**Acceptance criteria：**

- 新增測試：(a) config 解析在缺欄位時回退 seed 預設；(b) inspector 欄位存在且型別正確（每張卡/widget 的內部樣式、背景版位）；(c) runtime 將 config 值套成 inline style/CSS 變數（render test 斷言對應 style）；(d) seed 等價（不設 draft 時 render 與現值一致）。
- `pnpm --filter @solar-display/web test`、`pnpm run build:shared`、`pnpm run build:web` 全綠。
- 手動：editor 改一張卡的數值字級與背景 band 高度，draft 預覽即時變化。

**Scope boundaries：**

- In scope：density widget 樣式 config（reuse `DisplayCardStyleConfig`）、`trendHeight` 與 `valueRowAlign=end` 擴充、其 editor 欄位、runtime inline 套用、seed 等價、測試；背景版位以 guard 測試確認既有 hero media 能力涵蓋。
- Out of scope：為 KPI 卡新增平行 internal-style config（沿用既有 cardStyles，不重造）、新增平行 `backgroundPlacement` config（沿用既有 `heroContainer`+`heroMedia` placement/effects，不重造）、Better 最終像素值、其他 playback 頁、server/DB、shared card 對其他頁外觀、backgroundPool 候選來源邏輯（沿用）。
- 注意：`DisplayCardStyleConfig`／`buildDisplayCardStyleVars`／`buildDisplayCardStyleFields` 為 shared（其他頁也用）。擴充 `trendHeight`、`valueRowAlign=end` 為 additive（既有 caller 不傳則走 seed 預設、`--display-card-trend-height` 帶現值 fallback），不改其他頁外觀；以 `displaySurfaceVisualGuardrails.test.ts`／`style.test.ts` 守住。

## Risks / Trade-offs

- [stylesheet 改為 var() 引用可能影響其他頁] → 只改 Overview-only class（`overview-*`）與 Overview 專屬卡片實例，shared `displayPageCards.css` 若需引用則一律帶現值 fallback，確保其他頁不變；以 `displaySurfaceVisualGuardrails.test.ts`／`style.test.ts` 守住。
- [新增大量欄位使 inspector 過長] → 以 region 分群（每張卡/widget 一個內部樣式區塊），沿用既有摺疊式 region 呈現。
- [seed 與現值不一致導致畫面跑掉] → 逐一以目前 CSS 實際值設 seed 預設，並加「seed 等價」render 測試。
- [density widget 的自訂值顯示尚未全部接 cardStyle 變數] → 已接：header title/subtitle 字級、icon、padding、radius、trend 高度。**殘留限制**：weather 溫度、phase 表格、trend meta、alert 項等 widget-specific 值字級目前仍用各自 overview.css 字級，未綁 `--display-card-value-size`；故 `widgetStyles.*.valueFontSize` 對這些自訂內容暫不生效。屬 widget-specific 後續工作，是否補綁由使用者決定（不影響 KPI 卡與 seed 等價）。

## Migration Plan

- 無 DB schema 變更；新欄位為 config 可選，舊 config 缺欄位時走 seed 預設，既有 draft/live 不需遷移。
