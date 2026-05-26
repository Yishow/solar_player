## Why

Shared Shell Decorations 的 authoring surface 雖然已能新增、排序、隱藏與編輯欄位，但目前 preview canvas 只是被動預覽：`ShellDecorationPreviewCanvas` 只畫 selected outline，沒有 canvas 點選、拖曳、resize、zoom/pan 或 shell guide。這和「reuse editor canvas primitives」以及 operator 對 shell 裝飾像 page object 一樣直接調整的期待有落差，也讓 Shared Shell Decorations 看起來像表單頁而不是真正的 editor。

## What Changes

- 讓 shell decoration preview 支援直接 canvas selection，而不是只能從 object list 選物件。
- 支援在 header/footer band 內拖曳與 resize shell objects，並套用與 page editor 一致的 FHD coordinate mapping。
- 在 shell canvas 中顯示 header/footer band guides、selected object frame、live dimensions。
- 保留 object list 作為重疊物件的精準選取與 layer 管理入口。

## Capabilities

### New Capabilities

- `display-editor-shell-decoration-canvas-authoring`: 定義 shell decoration authoring 必須具備直接畫布操作能力，不只是表單與靜態預覽。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-shell-decoration-canvas-authoring
- Affected code:
  - Modified: apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx, apps/web/src/pages/ShellDecorationEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - Tests: apps/web/src/pages/ShellDecorationEditor/index.test.tsx, apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
