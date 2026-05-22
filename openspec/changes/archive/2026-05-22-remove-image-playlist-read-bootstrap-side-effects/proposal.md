## Problem

目前 `Images` runtime read path 預設會用 `bootstrap=true` 讀 `/api/image-playlist`，導致單純播放或 preview 讀取也會隱式建立 `image_playlist_entries` rows。結果是 read 行為會偷偷改動治理資料，讓播放端流量、preview hydration 與 operator 真正的 bootstrap 決策混在一起。

## Root Cause

- `apps/web/src/hooks/useImagePlaylistRuntime.ts` 固定把 runtime fetch 寫成 `bootstrap: true`。
- `apps/server/src/routes/image-playlist.ts` 與 `apps/server/src/services/imagePlaylistService.ts` 把 runtime resolved playlist 與 governance row bootstrap 綁成同一路徑。
- 管理頁雖然已經有顯式 `/api/image-playlist/governance/bootstrap`，但 runtime read contract 仍保留會寫資料的 fallback。

## Proposed Solution

- 把 image playlist read model 拆成「純 runtime resolved playlist read」與「顯式 governance bootstrap」兩條路徑。
- 讓 runtime 與 preview hydration 讀取永遠是 side-effect free，即使 playlist rows 尚未建立，也能以 image assets 與既有 rows 疊合出可播放結果。
- 保留治理端的顯式 bootstrap action，但只有 operator 明確執行時才會建立或補齊 governance rows。

## Non-Goals

- 不重做 `Images` 頁面版型或播放 fallback 視覺。
- 不在這個 change 內新增新的 playlist authoring 欄位。
- 不把所有 image asset mutation 都改成 transactional draft system。

## Success Criteria

- 單純 GET runtime playlist 不會再建立或修改 `image_playlist_entries` rows。
- 當治理 rows 尚未存在時，`Images` runtime 仍可解析出可播放的順序與 fallback 狀態。
- 管理頁保留顯式 bootstrap 能力，且其 mutation 與 runtime read contract 清楚分離。

## Impact

- Affected code:
  - Modified:
    - apps/web/src/hooks/useImagePlaylistRuntime.ts
    - apps/web/src/services/api.ts
    - apps/server/src/routes/image-playlist.ts
    - apps/server/src/services/imagePlaylistService.ts
    - apps/server/src/routes/display-ops.test.ts
    - apps/server/src/routes/image-playlist.test.ts
    - apps/web/src/pages/Images/index.tsx
  - New:
    - packages/shared/src/imagePlaylistRuntime.ts
  - Removed: (none)
