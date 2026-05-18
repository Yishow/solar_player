## Why

`PlaybackSettings`、`ImageManagement` 與 display editor 目前還是三個分開的管理面：播放端不知道某頁 draft 是否尚未發布，圖片管理頁也不知道哪些素材正被哪個展示頁正式引用。若不把這些 surface 串成同一套 display operations workflow，維運人員仍要靠人工比對才能安全發佈與排錯。

## What Changes

- 讓 `PlaybackSettings` 直接承接 display rotation plan、發布狀態與 skip reason，顯示哪些頁面因未發布、停用或條件不符而不會進入正式輪播。
- 讓 `ImageManagement` 顯示素材被哪些展示頁與 slideshow 引用、目前是 draft 還是 live 資產，以及素材失效會影響哪些正式頁面。
- 補上跨頁管理提示，讓播放設定與圖片管理頁能看到 editor 的未發布變更、資產健康狀態與需要先處理的阻塞。
- 將播放與圖片管理的儲存事件接入 display operations event stream，讓相關 management surfaces 在資料變動時能同步更新，不再各自輪詢或停留在舊狀態。

## Capabilities

### New Capabilities

- `playback-settings-display-ops-integration`: 提供播放設定頁對 display rotation、發布狀態與 skip reason 的整合視圖。
- `image-management-display-reference-integration`: 提供圖片管理頁查看展示頁素材引用、draft and live 使用狀態與影響面。
- `display-ops-cross-surface-sync`: 提供播放設定頁、圖片管理頁與 display editor 之間的同步事件與阻塞提示能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-settings-display-ops-integration`, `image-management-display-reference-integration`, `display-ops-cross-surface-sync`
- Affected code:
  - Modified: `apps/web/src/pages/PlaybackSettings/index.tsx`, `apps/web/src/pages/ImageManagement/index.tsx`, `apps/web/src/pages/DisplayPagesEditor/index.tsx`, `apps/web/src/services/api.ts`, `apps/web/src/services/socket.ts`, `apps/server/src/routes/playback.ts`, `apps/server/src/routes/images.ts`, `apps/server/src/realtime/SocketService.ts`
  - New: `apps/server/src/routes/display-ops.ts`, `apps/server/src/services/displayOpsService.ts`, `packages/shared/src/displayOps.ts`
  - Removed: none
