## Why

目前五個展示頁雖然都已接入 editor，但播放端仍缺少正式的 rotation policy 與條件式播放控制，導致頁面是否啟用、播放多久、異常時是否跳過，都散落在既有播放流程或硬編碼行為裡。若不把播放控制獨立成一個明確 change，後續每加一種展示內容都會讓輪播邏輯更難維護。

## What Changes

- 建立展示頁 rotation plan，讓每一頁都可設定啟用狀態、播放秒數、排序與預設輪播順序。
- 補上條件式播放控制，讓頁面可依資料新鮮度、素材健康狀態、排程時段或維護停用狀態決定是否進入正式播放。
- 為播放端加入 skip reason 與 fallback route policy，使播放器可在頁面被略過時留下可診斷原因，而不是靜默失效。
- 在管理端提供 rotation 預覽與啟用結果，讓維運人員能看到目前正式輪播鏈在不同條件下會如何選頁。

## Capabilities

### New Capabilities

- `display-page-rotation-plan`: 提供展示頁的正式輪播順序、啟用狀態與播放秒數配置能力。
- `display-page-conditional-playback`: 提供根據資料、素材、時段與維護狀態決定頁面是否播放的條件規則。
- `display-page-skip-reason-reporting`: 提供輪播端跳頁原因、降級選頁結果與診斷資訊。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-rotation-plan`, `display-page-conditional-playback`, `display-page-skip-reason-reporting`
- Affected code:
  - Modified: `apps/web/src/layouts/DisplayCanvas.tsx`, `apps/web/src/layouts/offlineRouting.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/playback.ts`, `apps/server/src/routes/display-pages.ts`, `packages/shared/src/index.ts`
  - New: `packages/shared/src/displayRotation.ts`, `apps/server/src/services/displayRotationService.ts`, `apps/web/src/pages/PlaybackSettings`, `apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts`
  - Removed: none
