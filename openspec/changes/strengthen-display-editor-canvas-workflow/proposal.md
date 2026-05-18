## Why

目前 display editor 只能用點選 overlay 加文字/數字欄位微調，缺少拖拉、縮放、對齊、鍵盤微移與跨頁套用等真正可用的畫布編輯能力。若不把 canvas authoring 升級成一個獨立 change，後續再加更多可編輯區塊只會放大維運成本與操作挫折。

## What Changes

- 為 display editor 補上直接拖曳、縮放、鍵盤 nudging、snap guides 與 zoom/pan，讓幾何調整不再只靠手動輸入數字。
- 建立 region tree 與畫布選取輔助，讓同頁大量區塊可被快速定位、切換與鎖定，降低 overlay 很多時的誤選風險。
- 補上 seed reset、copy/paste geometry 與跨頁套用版位能力，支援像 Overview/Solar 或同家族 card 區塊的快速對齊作業。
- 為 editor 建立操作暫存與 undo/redo 邏輯，讓維護者能安全試調版位而不必每次都手動回填數值。

## Capabilities

### New Capabilities

- `display-editor-canvas-manipulation`: 提供 display editor 的拖曳、縮放、縮放比例切換、鍵盤微移與 snap guides 操作能力。
- `display-editor-region-navigation`: 提供 region tree、選取同步、鎖定與快速定位能力。
- `display-editor-layout-reuse`: 提供 seed reset、copy and paste geometry、跨頁套用版位與 undo/redo 操作能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-canvas-manipulation`, `display-editor-region-navigation`, `display-editor-layout-reuse`
- Affected code:
  - Modified: `apps/web/src/pages/DisplayPagesEditor/index.tsx`, `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`, `apps/web/src/hooks/useDisplayEditor.ts`, `apps/web/src/hooks/useDisplayPageConfig.ts`
  - New: `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts`, `apps/web/src/pages/DisplayPagesEditor/regionTree.tsx`, `apps/web/src/pages/DisplayPagesEditor/history.ts`
  - Removed: none
