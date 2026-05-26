## Why

Display editor 內的 page freeform objects 與 shell decorations 已使用 asset-library-backed picker，但實作只是共用一個 `<select>`：只能看文字 label，沒有縮圖、分類、usage scope、引用摘要，也不能跳回圖庫管理。這和「圖庫/資產庫支援編輯工作流」有落差，operator 選背景、圖示、裝飾圖時很容易選錯素材。

## What Changes

- 將 page/shell object asset picker 從 select-only control 升級為 gallery-backed picker。
- 在 picker 內顯示縮圖、分類、usage scope、搜尋/篩選與目前選取預覽。
- 讓 picker 能開啟或 deep-link 到 `/display-pages/editor` 內的 asset library workspace。
- 保留現有 managed asset reference payload，不改 server storage。

## Capabilities

### New Capabilities

- `display-editor-gallery-backed-asset-picker`: 定義 editor 內的 asset selection 必須具備圖庫式視覺挑選與上下文返回能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-gallery-backed-asset-picker
- Affected code:
  - Modified: apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx, apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/AssetLibrary/index.tsx
  - Tests: apps/web/src/pages/ShellDecorationEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/AssetLibrary/index.test.tsx
