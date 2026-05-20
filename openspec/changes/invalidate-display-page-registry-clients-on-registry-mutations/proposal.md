## Why

server 目前在 registry mutation 後已發出 `display:sync` 與 playback update，但 `useDisplayPageRegistry()` 仍只在 mount 時抓一次。這讓 `DisplayPageRouteHost` 與 `DisplayPagesEditorRoute` 可能長時間保留過期頁面定義，削弱 generalized registry model 的真正動態性。

## What Changes

- 為 registry-consuming clients 建立 mutation-aware invalidation contract，讓 route host、editor、以及其他依賴 registry 的 surface 在相關事件後重新同步。
- 明確規範 registry reload 與 route fallback 行為，避免舊 route、已封存 page、或新建 page 在 client 側停留過期狀態。
- 補上 targeted tests，確認 create / update / archive 後 client surfaces 會反映最新 registry。

## Non-Goals

- 不重寫 display page registry 的資料模型。
- 不改變 page template rendering contract，只處理 registry snapshot 的同步一致性。

## Capabilities

### New Capabilities

- `display-page-registry-runtime-invalidation`: 定義 registry-consuming clients 在 display page registry mutation 後如何失效本地快取並重建路由/編輯定義。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-registry-runtime-invalidation`
- Affected code:
  - Modified: `apps/web/src/hooks/useDisplayPageRegistry.ts`
  - Modified: `apps/web/src/pages/shared/displayPageRouteHost.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`
  - Modified: `apps/web/src/pages/shared/displayPageRouteHost.test.ts`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`
  - Modified: `apps/server/src/routes/display-page-registry.ts`
