## Why

目前 header/footer 的裝飾仍綁在固定 shell markup 與 page-local CSS，無法像 hero 區一樣以可管理物件的方式放置線條、裝飾圖或上傳素材。若不先定義共用 schema、draft/live 儲存與驗證契約，後續 shell 裝飾、頁面自由物件與資產庫會各自長出不同資料形狀，導致 editor、runtime 與管理面難以共用。

## What Changes

- 新增 shared shell decoration schema，定義全站共用 header/footer 裝飾物件的 draft/live envelope、預設 seed 與 public-safe read contract。
- 定義第一波支援的 shell decoration object types：line、asset-image、ornament-image，並建立可被 shell 與後續 page objects 共用的基礎 object shape。
- 新增 shell decoration publish validation，限制 mount=header|footer、band-safe geometry、可接受的 source payload 與 deterministic object ordering。
- 新增 server/web/shared 讀取契約，讓後續 runtime renderer、editor 與資產管理頁都能使用同一份物件資料模型，而不是把裝飾混進單頁 page config。

## Capabilities

### New Capabilities

- `shared-shell-decoration-objects`: 定義全站共用 shell 裝飾物件的儲存、驗證與讀取契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: shared-shell-decoration-objects
- Affected code:
  - New: packages/shared/src/shellDecorations.ts, apps/server/src/services/shellDecorationService.ts, apps/server/src/routes/shell-decorations.ts, apps/server/src/routes/shell-decorations.test.ts, apps/web/src/services/shellDecorations.ts
  - Modified: packages/shared/src/index.ts, packages/shared/src/displayEditorSchema.ts, apps/server/src/app.ts, apps/server/src/services/displayPagePublishingService.ts
  - Removed: none
