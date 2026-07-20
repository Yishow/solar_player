## Why

目前 display editor 只能調整文案、媒體 placement 與 region 幾何，無法持久化 card 內的字體、數值列、內距、surface 節奏。這讓 `Overview`、`Solar`、`Sustainability`、`Images` 的 card 視覺語言即使已收斂到 shared primitives，日後仍只能靠程式碼改動維護，無法由 editor 安全地做小幅設計調整。

## What Changes

- 新增可持久化的 card appearance override contract，覆蓋 `Overview` summary/KPI、`Solar` KPI、`Sustainability` KPI/stat、`Images` info card 等已採 shared card family 的區塊。
- 在 editor inspector 暴露細粒度欄位，讓操作員可調整 title/subtitle/value/unit typography、header gap、icon box size、card padding、corner radius、value-row alignment、footer spacing 等樣式 token。
- 讓 editor preview、draft save、publish 後的 playback route 共用同一套 style override contract，而不是只在 editor 預覽套局部 CSS。
- 加入 validation、reset 與 fallback 行為，確保缺漏欄位時回退到既有 shared baseline，而不是讓 card 出現破版或空值樣式。

## Non-Goals

- 不處理 icon source、SVG 來源選擇、hero/main-stage `Image Source` 綁定模式。
- 不重算 `left`、`top`、`width`、`height`，也不改 FHD 固定畫布縮放模型。
- 不把 `FactoryCircuit` 的 node/load-row 外觀納入本 change。
- 不碰 `region tree`、publish workflow、management shell 或 draft/live 版本流程。

## Capabilities

### New Capabilities

- `display-editor-card-style-overrides`: 讓 display editor 可持久化並套用 card appearance overrides，且 preview/runtime/publish 共享同一套 card style contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-card-style-overrides`
- Affected code:
  - Modified:
    - apps/web/src/components/displayPageCards.tsx
    - apps/web/src/components/displayPageCards.css
    - apps/web/src/components/displayPageCards.test.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Solar/solar.css
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Sustainability/sustainability.css
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/Images/images.css
  - New:
    - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - Removed: (none)
