## Why

要把 `/overview` 對齊 `docs/reference/Better/01.Overivew (大).png` 到像素級，必須能精準調整每張卡片的「內部排版」（icon 尺寸、label/數值字級、內距、sparkline 高度、內部對齊）以及「滿版背景照片」的尺寸/位置。但目前 `/display-pages/editor` 的 Overview inspector 只暴露每個元素的 Left/Top/Width/Height 外框與 hero 文案，card 內部排版與背景大小全寫死在 `overview.css`／`displayPageCards.css`（背景現為 hardcode 的 `.overview-page-background { inset: 0 }`）。依專案 editor-capability-first 原則，這是一個 editor capability gap：要做到像素級又不在 page CSS 寫死 Better 數值，必須先把這些旋鈕變成 editor 可調的 config，由 runtime 以 inline style／inline CSS 變數消費。

## What Changes

- KPI 卡的內部樣式（icon 尺寸、label/subtitle/數值字級、卡片內距、內部對齊）**沿用既有 `cardStyles`（`DisplayCardStyleConfig`）**，該能力已可由 editor 編輯（`buildDisplayCardStyleFields` inspector + `buildDisplayCardStyleVars` runtime inline 變數 + region schema），本 change 不為 KPI 卡重造平行 config。
- 為 4 個 density widget（weather/phasePower/generationTrend/alertNotifications）新增 `widgetStyles`（型別＝既有 `DisplayCardStyleConfig`），runtime 比照 KPI 卡以 `buildDisplayCardStyleVars` 套 inline 變數，補上目前缺少的 widget 內部樣式可調能力。
- 擴充既有 `DisplayCardStyleConfig`：新增 `trendHeight`（sparkline/趨勢區高度，seed 56px，輸出 `--display-card-trend-height`）、`valueRowAlign` 擴為 `start|center|end`；為 additive，其他頁不傳則走 seed 預設、stylesheet 以 `var(--display-card-trend-height, 56px)` 帶現值 fallback，不在 stylesheet 寫死 Better 像素數值。
- 為 Overview 滿版背景新增「尺寸/位置」config（band 高度、`object-position`、底緣淡出比例），runtime 以 inline style 套用，取代目前 hardcode 的 `.overview-page-background { inset: 0 }`；背景候選來源沿用既有 backgroundPool，不回退。
- 在 editor inspector（`apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` 與 Overview region schema）新增對應欄位，沿用既有 typed inspector 與 region schema 模式，draft/live 可持久化。
- 補 seed 預設值（與目前視覺等價，避免破壞現況）與測試（config 解析、inspector 欄位、runtime 套用、render）。

## Non-Goals

- 不在本 change 內把 Overview 對齊到 Better 的最終像素值；本 change 只交付「可調的 editor capability + 等價 seed 預設」，實際對齊值由後續在 editor 內設定 draft。
- 不改 server API、SQLite schema、MQTT 架構，也不改 display page config 的持久化端點。
- 不回退或重做既有未提交的 background pool 工作（候選圖池與其 inspector array 欄位）。
- 不在 `overview.css`／`displayPageCards.css` 寫死 Better 的像素數值；stylesheet 僅引用 config 提供的變數。
- 不改其他 playback 頁（Solar / Factory Circuit / Images / Sustainability）或 shared card 元件對其他頁的既有外觀。

## Capabilities

### New Capabilities

- `overview-card-internal-style-authoring`: 定義 Overview KPI 卡與 density widget 的「內部樣式」config schema、其 editor inspector 欄位，以及 runtime 以 inline style／inline CSS 變數消費這些值的綁定契約與 seed 預設。
- `overview-background-placement-authoring`: 定義 Overview 滿版背景的尺寸/位置 config（band 高度、object-position、底緣淡出）、其 editor inspector 欄位，以及 runtime 以 inline style 套用、取代 hardcode `inset: 0` 的綁定契約與 seed 預設。

### Modified Capabilities

(none)

## Impact

- Affected specs:
  - 新增 `overview-card-internal-style-authoring`
  - 新增 `overview-background-placement-authoring`
- Affected code:
  - Modified:
    - packages/shared/src/displayPageConfig.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - New:
    - openspec/changes/add-overview-pixel-authoring-controls/specs/overview-card-internal-style-authoring/spec.md
    - openspec/changes/add-overview-pixel-authoring-controls/specs/overview-background-placement-authoring/spec.md
