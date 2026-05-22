## Why

一旦 display page card rail 改成模板化卡片，現有 Sustainability highlight array 欄位已不足以支撐實際營運操作；操作者需要直接在 editor 中新增、切換、排序與拖拉卡片，而不是靠固定 item 陣列硬改文案。若 editor 不同步補強，card rail 雖然在 schema 與 runtime 上可用，管理面仍會停留在半成品狀態。

## What Changes

- 讓 display pages editor 將 card rail 視為可編排的卡片集合，而不是固定 highlight item 陣列。
- 新增 card rail 卡片的建立、刪除、複製、顯示開關、排序與模板切換操作。
- 讓操作者可在 canvas 上選取、拖拉與縮放單張 rail 卡片，並保留 rail 區域邊界與 draft workflow 約束。
- 為不同 rail 卡片模板提供 typed inspector controls，讓欄位編輯跟著模板切換。

## Capabilities

### New Capabilities

- display-editor-card-rail-authoring: 讓 display pages editor 以模板化卡片模型編排與編輯 card rail 內容。

### Modified Capabilities

- display-editor-canvas-manipulation: Canvas 幾何操作需支援 rail 內單張卡片，而不只支援既有頁面 region。
- display-editor-page-authoring-coverage: 支援 card rail 的 display page 需在 editor 中暴露可操作的 rail 卡片 authoring coverage。
- display-editor-typed-inspector-controls: Inspector 需支援依卡片模板切換欄位，而不是只對固定 region schema 陣列欄位做編輯。
- display-editor-region-navigation: 擁擠畫布中的導覽樹需能辨識 rail 與其子卡片，讓操作者可以從導覽面板選取卡片。

## Impact

- Affected specs: display-editor-card-rail-authoring, display-editor-canvas-manipulation, display-editor-page-authoring-coverage, display-editor-typed-inspector-controls, display-editor-region-navigation
- Affected code:
  - New: apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts, apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - Modified: apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx, apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx, apps/web/src/pages/DisplayPagesEditor/regionTree.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts, apps/web/src/pages/Sustainability/displayPageConfig.ts
  - Removed: none
