## Why

`display_page_registry` 已經允許同 template 的多個展示頁實例與自訂 route slug，但 playback shell 仍把 route metadata、footer tabs、active state 與 offline eligibility 綁在靜態 `routeMeta.ts`。這讓 registry-backed 播放頁雖然可以 render，殼層卻可能把它當成 `/overview` 或未知頁，造成導航、故障導頁與播放 UI 語意失真。

## What Changes

- 讓 playback shell 以 registry-backed route instance 解析播放頁的 shell metadata，而不是只依賴靜態 `routeMetaMap`。
- 為動態播放頁建立可序列化的 playback route metadata contract，至少涵蓋 nav label、title/subtitle、offline eligibility、order 與 shell group。
- 更新 footer navigation、active state 與 playback-shell route 判斷，讓 duplicate template instances 與自訂 slug 使用自身 metadata，而不是 fallback 到內建 canonical route。
- 讓 offline routing 與 playback shell metadata 共用同一份 registry-aware route resolution，避免未知 slug 被誤判為 `/overview` 或被錯誤導向。

## Capabilities

### New Capabilities

- `dynamic-playback-shell-metadata`: 定義 registry-backed 播放頁 shell metadata 與 route resolution contract，讓 playback shell、footer 與 offline routing 能正確處理自訂 slug 與 duplicate template instances。

### Modified Capabilities

- `display-page-registry-runtime-invalidation`: 將 registry mutation 後需要失效重載的 client 範圍擴大到 playback shell metadata consumers，而不只 page host route resolver。

## Impact

- Affected specs: `dynamic-playback-shell-metadata`, `display-page-registry-runtime-invalidation`
- Affected code:
  - New: `apps/web/src/app/playbackRouteMeta.ts`, `apps/web/src/app/playbackRouteMeta.test.ts`
  - Modified: `apps/web/src/app/routeMeta.ts`, `apps/web/src/layouts/LayoutShell.tsx`, `apps/web/src/layouts/offlineRouting.ts`, `apps/web/src/components/AppFooterNav.tsx`, `apps/web/src/hooks/useDisplayPageRegistry.ts`, `apps/web/src/pages/shared/displayPageRouteHost.tsx`, `apps/web/src/components/shellFoundation.test.ts`, `apps/web/src/layouts/offlineRouting.test.ts`
  - Removed: none
