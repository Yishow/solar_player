## Why

目前 Display Pages Editor 已有 dashed guide overlay，但實作把 overlay 放在內容預覽層內，header/footer shell band 不在 overlay 覆蓋範圍。因此 operator 在 `/display-pages/editor` 編輯時只能看到 content 區域參考線，看不到 header/footer 的虛線與 shell 邊界，和「同一個 FHD shell 預覽可對齊整頁」的產品期待不一致。

## What Changes

- 將 editor guide overlay 的覆蓋範圍提升為完整 shell preview，包括 header、content、footer 三個 band。
- 補上 header/content/footer band boundary guides，讓 operator 可直接看見 shell chrome 與 page content 的切線。
- 保留既有 page region guides、selected-only/full-canvas overlay mode、zoom/pan/design-space mapping，不改 page config schema。
- 增加測試，驗證 guide overlay 在 header/footer 可見且仍跟隨 preview scale、zoom、pan。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-editor-canvas-manipulation`: 強化 guide overlay 的覆蓋範圍，要求 full shell preview 內 header/footer 也能顯示 dashed guides。

## Impact

- Affected specs: display-editor-canvas-manipulation
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - Tests: apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
