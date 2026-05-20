## Summary

將 display page 從目前硬綁在五個內建頁型的靜態模型，改成「內建模板 + 可持久化頁面實例」的 registry 模型，讓 playback、editor 與 route shell 不再以寫死陣列當唯一真相來源。

## Motivation

目前頁面模型同時被 `packages/shared/src/displayPageConfig.ts` 的 `displayPageKeys`、`apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`、`apps/web/src/app/router.tsx` 與 `PlaybackSettings` 的禁用新增按鈕綁死成五頁。雖然資料庫已有 `playback_pages`，但它只能調整既有五頁的順序與秒數，無法新增、封存、複製或替換 page instance。這讓播放模型、編輯器、路由與後端資料表的責任邊界混亂，也直接卡住使用者要改善「硬鎖五頁」的要求。

## Proposed Solution

- 引入 display page registry，區分「模板種類」與「頁面實例」。
- 讓 `playback_pages` 與 editor tabs 改以 registry/API 驅動，而不是共享常數陣列。
- 保留現有五個頁型作為第一批 template kinds，但不再把它們視為永遠唯一可播放的 page set。
- 補上 create/archive/reorder/route-slug 驗證流程，讓新增頁面有正式 contract。

## Non-Goals

- 不在這個 change 直接做任意元件自由拼裝的 page builder。
- 不重做五個既有 display page 的視覺版型。
- 不把 management shell 與 playback shell 重構混進同一個 change。

## Impact

- Affected specs: `display-page-registry-and-playback-model`, `display-page-rotation-plan`
- Affected code:
  - Modified: `packages/shared/src/displayPageConfig.ts`
  - Modified: `packages/shared/src/types.ts`
  - Modified: `apps/server/src/services/displayRotationService.ts`
  - Modified: `apps/server/src/routes/playback.ts`
  - Modified: `apps/server/src/db/seed.ts`
  - Modified: `apps/web/src/app/routeMeta.ts`
  - Modified: `apps/web/src/app/router.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/index.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
  - Modified: `apps/web/src/pages/PlaybackSettings/index.tsx`
  - New: `apps/server/src/db/migrations/*`
  - New: `apps/server/src/routes/display-page-registry.ts`
  - New: `apps/server/src/services/displayPageRegistryService.ts`
  - New: `apps/web/src/hooks/useDisplayPageRegistry.ts`
