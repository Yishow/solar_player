## Why

Asset Library 已做成獨立 `/settings/assets` 頁面，但使用者實際是在 `/display-pages/editor` 編輯頁面、挑圖片、替換背景與物件。獨立頁面讓圖庫像設定工具，不像 editor 工作流的一部分；目前圖庫頁也過於簡化，沒有足夠的分類、引用、使用位置與挑選上下文，無法支撐 page objects 與 shell objects 的日常編輯。

## What Changes

- 將 Asset Library/Gallery 作為 `/display-pages/editor` 內的 workspace，不再以獨立全頁作為主要入口。
- 在 editor 內提供更完整的圖庫管理：分類、搜尋、縮圖密度切換、上傳、引用狀態、使用位置、刪除保護。
- 讓 page media、freeform objects、Shared Shell Decorations 的 asset picker 都能回到同一個 integrated gallery。
- 保留現有 asset API、metadata、delete guards；舊 `/settings/assets` 可作為 redirect 或次要入口，但 canonical authoring route 是 `/display-pages/editor`。

## Capabilities

### New Capabilities

- `display-editor-asset-library-workspace`: 定義圖庫必須整合在 Display Pages Editor route 內，並提供可支援編輯工作流的 asset 管理體驗。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-asset-library-workspace
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/AssetLibrary/index.tsx, apps/web/src/app/router.tsx, apps/web/src/layouts/ManagementShell.tsx, apps/web/src/services/api.ts
  - Tests: apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/AssetLibrary/index.test.tsx, apps/web/src/app/router.test.tsx
