## Why

目前 display 資產來源分散在圖片管理、brand 素材、page-local icon source 與各頁上傳欄位中，缺少一個正式的分類資產庫來管理背景、物件與 ICON。當 shell decorations 與 page freeform objects 開始依賴上傳來源後，若沒有單一的分類資產目錄與刪除保護，asset 會持續散落在不同 surface，難以追蹤引用與安全刪除。

## What Changes

- 新增 dedicated display asset library management surface，提供 `背景`、`物件`、`ICON` 分類分頁與搜尋、摘要、引用資訊。
- 新增資產上傳與分類指派流程，讓新圖像或 SVG 能在進入資產庫時直接指定 category 與 usage scope。
- 為 managed assets 新增 category 與 usage-scope metadata，讓同一套資產可明確標記為 shell only、page only 或 both。
- 擴充 managed asset reference contract，讓 display page media、shared shell decorations 與 page freeform objects 共用同一種 asset reference 與 missing-asset 診斷。
- 新增 delete guards 與 usage reporting，避免仍被 shell/page config 引用的 asset 被靜默刪除。

## Capabilities

### New Capabilities

- `display-asset-library-management`: 提供分類式資產庫管理面、metadata 與引用保護能力。

### Modified Capabilities

- `display-page-asset-library-binding`: 將 managed asset references 從 page media fields 擴充到 shell decorations 與 page freeform objects 的 asset-backed payload。

## Impact

- Affected specs: display-asset-library-management, display-page-asset-library-binding
- Affected code:
  - New: apps/web/src/pages/AssetLibrary/index.tsx, apps/web/src/pages/AssetLibrary/index.test.tsx, apps/server/src/routes/asset-library.ts, apps/server/src/routes/asset-library.test.ts, apps/server/src/services/assetLibraryService.ts, apps/web/src/pages/AssetLibrary/uploadForm.tsx
  - Modified: apps/server/src/routes/images.ts, apps/server/src/services/displayPageAssetService.ts, apps/server/src/services/displayPagePublishingService.ts, apps/web/src/services/api.ts, apps/web/src/pages/ImageManagement/index.tsx, apps/web/src/services/shellDecorations.ts, packages/shared/src/index.ts
  - Removed: none
