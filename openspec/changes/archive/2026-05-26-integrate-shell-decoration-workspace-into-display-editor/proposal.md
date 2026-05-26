## Why

Shared Shell Decorations 目前有獨立 `/shell-decorations/editor` authoring page。這解決了編輯能力，但產品上造成兩個問題：第一，它和 Display Pages Editor 的 FHD preview、overlay、asset picker 工作流分裂；第二，使用者期待 header/footer shell 裝飾是在 display editor 同一路由內調整，而不是離開頁面編輯器到另一個全頁工具。

## What Changes

- 將 Shared Shell Decorations authoring 整合為 `/display-pages/editor` 內的 shell workspace。
- 在同一路由內提供 header/footer shell preview、object list、inspector、asset picker、save/publish。
- 保持 shared shell draft/live config 與 page draft/live config 分離，不把 shell publish 合併到 page publish。
- 舊 `/shell-decorations/editor` 可作為 redirect 或次要入口，但 canonical authoring route 是 `/display-pages/editor`。

## Capabilities

### New Capabilities

- `display-editor-shell-decoration-workspace`: 定義 Shared Shell Decorations 必須整合在 Display Pages Editor route 內，且保留獨立 draft/live lifecycle。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-shell-decoration-workspace
- Affected code:
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/ShellDecorationEditor/index.tsx, apps/web/src/app/router.tsx, apps/web/src/layouts/ManagementShell.tsx, apps/web/src/services/shellDecorations.ts
  - Tests: apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/ShellDecorationEditor/index.test.tsx, apps/web/src/app/router.test.tsx
