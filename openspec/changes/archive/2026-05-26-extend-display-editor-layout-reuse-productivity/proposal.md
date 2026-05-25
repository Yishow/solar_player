## Why

即使 overlay、量尺與對齊工具都到位，operator 仍會頻繁做兩種高重複操作：以鍵盤做細微幾何微調，以及把一個 region 的幾何複製到另一個相容 region。repo 目前已有 seed diff 與 geometry-compatible copy/paste 的基礎概念，也已有 keyboard nudge，但缺少更完整的步進策略、批次貼用與更清楚的相容性回饋，讓常見排版調整仍顯得零碎。

## What Changes

- 擴充 keyboard nudge，提供更明確的精細/一般/快速步進層級，並讓微調回饋與 overlay/measurement 同步。
- 擴充 geometry copy/paste，使 operator 能更清楚辨識相容目標、批次貼用幾何，並在需要時複用單一 axis 或完整 frame。
- 強化 layout reuse workflow，避免 operator 在多個相似 card、hero block 或 tile 之間重複手工輸入相同 geometry。

## Non-Goals

- 不在這個 change 內處理 snap、multi-select distribute 或 relational measurement。
- 不把 geometry clipboard 擴充為跨專案或系統層級剪貼簿。
- 不引入新的 runtime persistence model；所有結果仍落在既有 draft session 內。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-editor-layout-reuse`: 既有 geometry copy/paste 需要擴充為更完整的相容性提示、批次貼用與部分幾何複用。
- `display-editor-canvas-manipulation`: 既有 keyboard nudge 需要擴充為多層級步進與更清楚的微調回饋。

## Impact

- Affected specs: display-editor-layout-reuse, display-editor-canvas-manipulation
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts, apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - New: none
  - Removed: none
