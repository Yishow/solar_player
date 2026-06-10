## Why

DisplayPagesEditor 是目前最重的管理頁之一，每次進入都要等 registry、draft config、image assets、asset health、publishing state、editable region resolution、preview render、inspector tree 全部掛載。樹莓派上這會表現為 route 已到 `/display-pages/editor`，但編輯器內容一段時間後才完整出現。

## What Changes

- 新增 display editor staged loading 契約，要求 editor 首屏先呈現 page/workspace shell 與選頁狀態，再分段載入 draft config、assets、health、publishing、preview 與 inspector。
- DisplayPagesEditorRoute 使用 route 或 shared cache 提供 registry 初始資料，避免 useDisplayPageRegistry 每次從空陣列開始。
- useDisplayPageConfig 的 draft session hydration 改成可接受 initial envelope/session，並降低每次 render 的整份 JSON.stringify dirty 比對成本。
- 將 image picker getImages、useDisplayPageAssetHealth、useDisplayPagePublishingState 從 editor 首屏阻塞路徑拆出，保持既有錯誤顯示與 refresh 行為。
- 將 previewContent、resolveDisplayEditorRegions、resolveDisplayPageFreeformObjectRegions、inspector field issue resolution 的計算邊界收窄，避免非選中 workspace 或未開啟 tab 的重型子樹同步掛載。
- 保留 canvas manipulation、geometry clipboard、measurement overlay、asset workspace、shell workspace、save/publish/draft conflict 行為。

## Capabilities

### New Capabilities

- `display-editor-staged-loading`: DisplayPagesEditor SHALL separate route entry, draft config hydration, asset diagnostics, preview rendering, and inspector calculation into staged work while preserving existing authoring behavior.

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-staged-loading
- Affected code:
  - Modified: apps/web/src/app/router.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - Modified: apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - Modified: apps/web/src/hooks/useDisplayPageConfig.ts
  - Modified: apps/web/src/hooks/useDisplayPageRegistry.ts
  - Modified: apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - Modified: apps/web/src/pages/ShellDecorationEditor/index.tsx
  - Modified: apps/web/src/pages/AssetLibrary/index.test.tsx
  - Modified: apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - New: apps/web/src/pages/DisplayPagesEditor/loadModel.test.ts
  - New: apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - Removed: none
