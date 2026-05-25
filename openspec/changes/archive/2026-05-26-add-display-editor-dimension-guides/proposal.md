## Why

目前 `/display-pages/editor` 已經支援拖曳、縮放、zoom/pan 與鍵盤微移，但 `DisplayEditorCanvasCard` 內的實際 viewport 尺寸並不等於設計尺寸，畫布又缺少可切換的全畫 guide / 選取框模式。結果是 operator 在這個預覽區裡操作時，既看不到接近設計稿的整畫虛線節奏，也無法確認目前框線與尺寸回饋到底是 viewport pixel 還是實際設計尺寸，對齊效率低，且容易因為「全部都被框」而誤判目前真正選中的區塊。

## What Changes

- 在 `DisplayEditorCanvasCard` 的預覽 viewport 內加入可視的 guide overlay，讓 operator 能在同一塊操作區內看到整畫 reference 節奏，同時把 overlay 座標映射到可設定的 design space，預設為 `1920x1080`。
- 在 `DisplayEditorCanvasCard` 既有 controls 區加入 overlay 設定，至少支援 guide/框線的「點中的畫」與「全畫」模式切換、guide 刻度與座標軸顯示、非選中框線強度與可操作性，以及多組 design-space preset 與自訂尺寸。
- 在選取、拖曳或縮放 editable region 與 card rail child card 時，顯示以 design-space 尺寸為準的即時量測資訊；若 viewport 足以 1:1 容納 design space，則量測直接使用實際尺寸而不再做額外縮放換算。
- 把既有 canvas workflow 已經算出的 boundary guide / interaction feedback 真正渲染到 overlay 上，並把目前預設「全部都被框」的行為改成預設只框選中的 region，同時保留可切回全框模式的能力。
- 在 overlay 中補上可選的 region 名稱標籤與中心線顯示，並記住 operator 最近一次使用的 overlay preset，讓同一位 operator 回到 editor 時能延續上一組視圖偏好。

## Non-Goals

- 不重做 editor 的左側 region tree、右側 inspector 或發布流程。
- 不改變 live playback 頁面的實際排版資料結構；這次只補 editor 畫布上的視覺輔助與量測回饋。
- 不提供任意標尺繪製或自由註記工具；只顯示 editor 已知的版面 guide 與 geometry 量測資訊。
- 不把 overlay 設定擴充成通用頁面偏好中心；這次只處理 `DisplayEditorCanvasCard` 內直接影響 guide、框線、標籤、中心線與 design-space 映射的設定。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-editor-canvas-manipulation`: 既有畫布編輯能力需要擴充成可視化顯示 guide 與尺寸量測，讓 region/card 調整時能直接在 canvas 上獲得對齊與幾何回饋。

## Impact

- Affected specs: display-editor-canvas-manipulation
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - New: none
  - Removed: none
