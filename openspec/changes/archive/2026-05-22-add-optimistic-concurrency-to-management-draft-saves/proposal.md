## Problem

目前管理面草稿儲存基本上採 last-write-wins。以 display page draft 為例，client 讀到某一版 envelope 後，`PUT /api/display-pages/:pageId/draft` 並不驗證送出時是否仍建立在相同版本上；另一個 operator 或另一個分頁若已先保存新版本，較舊的 client 仍可直接覆寫。這會讓多人協作或多分頁編輯時無聲遺失變更。

## Root Cause

- `apps/web/src/hooks/useDisplayPageConfig.ts` 儲存時只送出 `regions`，沒有帶 base version 或 precondition。
- `apps/server/src/services/displayPagePublishingService.ts` 的 draft write path 永遠直接 upsert，沒有衝突檢查。
- 前端 draft session 雖保存 `lastLoadedEnvelope.version`，但沒有把它當成儲存前置條件，也沒有 conflict recovery UX。

## Proposed Solution

- 為 management draft save 建立 optimistic concurrency contract，至少先覆蓋 display page draft stage configs。
- client 儲存時帶上 base version 或等價 precondition，server 在版本落後時回傳明確 409 conflict envelope，而不是默默覆寫。
- 前端收到 conflict 後保留本地未儲存變更，並提供重新同步 / 比較 / 再套用的處理入口。

## Non-Goals

- 不在這個 change 內實作完整多人即時協作或 CRDT。
- 不處理 image management 等尚未有 authoritative draft envelope 的管理面資源；這些會在 future change 再接入共用 contract。
- 不在這個 change 內重做 display page editor UI 版面。

## Success Criteria

- 同一份 display page draft 若已被其他 session 更新，較舊 session 的 save 會收到明確 conflict，而不是覆寫最新資料。
- 前端可辨識 conflict 並保留本地編輯內容，不把未儲存草稿直接清掉。
- conflict contract 可被後續其他 management draft surfaces 重用，而不是綁死在單一路由私有格式。

## Impact

- Affected code:
  - Modified:
    - packages/shared/src/displayPageConfig.ts
    - apps/server/src/routes/display-pages.ts
    - apps/server/src/services/displayPagePublishingService.ts
    - apps/web/src/hooks/useDisplayPageConfig.ts
    - apps/web/src/services/api.ts
    - apps/web/src/pages/DisplayPagesEditor/index.tsx
    - apps/web/src/pages/DisplayPagesEditor/publishing.ts
    - apps/web/src/pages/managementDisplaySync.test.ts
    - apps/server/src/routes/display-pages.test.ts
    - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - New:
    - packages/shared/src/managementDraftConcurrency.ts
  - Removed: (none)
