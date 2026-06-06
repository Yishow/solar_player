## Why

長官臨時要求在 Overview 上加（或之後拿掉）三相電力、發電趨勢、警示通知這類卡片時，operator 目前無法在不動程式碼的情況下，於 `/display-pages/editor` 把單張卡片隱藏或重新顯示——KPI 卡片永遠都會 render。此外，現有 canvas 縮放雖可調卡片大小，但無法鎖定長寬比，operator 容易把卡片拉成不成比例而破壞 FHD 對齊。本次補上這兩個缺口，讓展示卡片在既有 editor 工作流內就能「按需顯示」且「等比例調整」。

Overview KPI 卡片的拖曳、吸附、版面安全驗證、draft/live 發布、KPI preset 都已存在（`display-editor-canvas-manipulation`、`display-editor-alignment-tools`、`display-page-layout-safety-guards`、`display-page-draft-live-publishing`、`display-editor-region-presets`），本次重用、不重做。意圖參考為 docs/reference/Better/01.Overivew (大).png；正式對照基準維持 docs/reference/FHD/01-1.Overview (大).png。

## What Changes

- 在 region geometry schema 新增等比例縮放模式：`resizeMode` 增加 `"proportional"` 值，canvas resize 在該模式下維持卡片原始長寬比。
- 在 display 卡片設定新增 per-card `visible` 旗標（預設 `true`），playback runtime 依旗標決定是否 render 該卡片。
- 在 editor 為支援的卡片提供「顯示/隱藏」toggle 欄位，寫回 draft 並依現有 draft/live 流程發布；隱藏的卡片在 playback 不出現、在 editor 仍可選取與重新顯示。
- 以 Overview 5 張 KPI 卡片作為首個套用 surface：KPI region 的 geometry 改用 `"proportional"`，並各自掛上 `visible` toggle。
- 對應 targeted tests：等比例 resize 行為、KPI `visible` 旗標的 runtime render、editor toggle 欄位與 schema。

## Capabilities

### New Capabilities

- `display-card-visibility-toggle`: 顯示卡片可由設定的 per-card `visible` 旗標控制是否在 playback runtime render，operator 透過 editor toggle 切換並經 draft/live 發布。
- `display-editor-proportional-resize`: 編輯器 canvas 縮放支援等比例鎖定模式，由 region geometry schema 的 `resizeMode: "proportional"` 啟用，維持卡片長寬比。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `display-card-visibility-toggle`、`display-editor-proportional-resize`
- Affected code:
  - Modified:
    - packages/shared/src/displayEditorSchema.ts
    - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
  - New:
    - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts（新增等比例 resize 案例，如檔案已存在則擴充）
    - apps/web/src/pages/Overview/cardVisibility.test.ts
  - Removed: (none)
