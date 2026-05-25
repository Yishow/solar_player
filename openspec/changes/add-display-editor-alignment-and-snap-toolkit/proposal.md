## Why

即使有 guide 與量測，operator 仍可能需要反覆拖曳與手動輸入數值來達成「等距、置中、對齊到其他 region 或 guide」這類常見版面操作。只看得見量尺而不能快速吸附、鎖定間距、或對多個 region 做批次對齊，仍然不足以支撐高頻版面編修。

## What Changes

- 在 display editor 中加入 snap toolkit，讓 region 可吸附到 guide、其他 region 邊界與中心線。
- 提供中心線與 snap 開關，讓 operator 可明確控制何時顯示或使用吸附輔助。
- 提供 distance lock，讓拖曳或縮放時可維持指定邊距或等距節奏。
- 提供 multi-select align / distribute 操作，讓多個 region 可做左對齊、右對齊、置中、水平分布與垂直分布。

## Non-Goals

- 不在這個 change 內處理任意兩個 region 的量尺與可拖動量測線。
- 不把 multi-select 擴充成群組化物件模型或持久化群組。
- 不重做 overlay preset、鍵盤幾何剪貼簿或 runtime payload。

## Capabilities

### New Capabilities

- `display-editor-alignment-tools`: 提供 snap、center lines、distance lock 與 multi-select align/distribute 操作。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-alignment-tools
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - New: none
  - Removed: none
