## Why

目前 editor 的量測回饋只覆蓋 selected region 自身尺寸與容器邊界距離，還無法回答「這兩個 region 彼此距離多少」或「我想沿著量尺直接把選中物件推到指定間距」這類真正常見的排版問題。當畫面上同時有多個 card、hero block、badge 或圖片節點時，operator 仍要靠目測與手動輸入數值對齊，效率不足。

## What Changes

- 在 display editor 內加入任意兩個 region 之間的自動量尺，讓 operator 能讀取水平、垂直與最近邊界距離。
- 提供暫時量測模式，讓 operator 可以在不改變既有選取語意的前提下檢視兩個 region 之間的距離。
- 讓量測線可成為調整把手，operator 拖動量測線或量測把手時，直接反寫 selected region 的幾何參數。
- 為量測標籤加入遮擋避讓策略，避免在密集畫面中被內容或彼此覆蓋而失去可讀性。

## Non-Goals

- 不在這個 change 內處理 snap、multi-select distribute、distance lock 等整體對齊工具。
- 不把任意量測結果寫回 runtime payload 之外的分析系統。
- 不重做 overlay foundation、design-space mapping 或 selected-only / full-canvas mode，本 change 依賴既有 overlay 基礎能力。

## Capabilities

### New Capabilities

- `display-editor-relational-measurement`: 提供 region-to-region 自動量尺、暫時量測模式、可拖動量測把手與標籤避讓規則。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-relational-measurement
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - New: none
  - Removed: none
