## Why

shared shell decoration schema 與 runtime render 建好後，operator 仍然沒有地方新增、選取、排序或隱藏 header/footer 物件，shell 裝飾就只能靠手改資料或程式碼。若不補 authoring surface，使用者想要「header/footer 像 hero 一樣放物件畫線」仍無法在正式產品內完成。

## What Changes

- 新增 shared shell decoration authoring surface，讓 operator 可以在同一個 FHD shell 預覽中編輯全站共用 header/footer objects。
- 支援新增、選取、刪除 line、asset-image、ornament-image shell objects，並依 mount=header|footer 管理。
- 新增物件列表、前後層排序、鎖定、顯隱、複製與直接選取，解決 shell 裝飾小物件難點選與容易互相遮蔽的問題。
- 新增 shell object 的幾何編輯與 asset picker，讓 operator 可以調整線條位置/長度/厚度，並從資產庫挑選裝飾圖來源。
- 新增 shell decoration draft/save/publish workflow，使 shared shell config 與單頁 display page config 分開管理。

## Capabilities

### New Capabilities

- `shared-shell-decoration-authoring`: 提供全站共用 shell decoration objects 的管理面編輯、排序與發佈能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: shared-shell-decoration-authoring
- Affected code:
  - New: apps/web/src/pages/ShellDecorationEditor/index.tsx, apps/web/src/pages/ShellDecorationEditor/index.test.tsx, apps/web/src/pages/ShellDecorationEditor/objectList.tsx, apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx, apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx, apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - Modified: apps/web/src/app/router.tsx, apps/web/src/layouts/ManagementShell.tsx, apps/web/src/hooks/useDisplayEditor.ts, apps/web/src/services/shellDecorations.ts, apps/web/src/services/api.ts
  - Removed: none
