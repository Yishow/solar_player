## Problem

目前品牌變更只靠管理頁本地 `window` event 觸發 reload；server 雖然已在 brand mutation 後送出 `display:sync` `scope: "brand"`，但 playback runtime 並沒有消費這個 invalidation contract。結果是 active brand、logo 或標語一旦被更新，其他已開啟的播放 session 會持續顯示舊資料，直到整頁重新整理。

## Root Cause

- `apps/web/src/hooks/useBrandAssets.ts` 只在 mount 與同頁 `notifyBrandChanged()` 時重新抓取資料。
- brand bootstrap 目前仍透過完整 `getBrandProfiles()` 管理讀取 contract，而不是專用的 playback-safe active-brand contract。
- playback runtime 沒有任何 socket 或 display-sync brand refresh wiring，因此 cross-session brand invalidation 沒有落地。

## Proposed Solution

- 建立 server-originated 的 brand runtime refresh contract，讓 active profile 切換、logo upload/delete 與文字更新都能對所有 playback session 發出一致 invalidation。
- 讓 playback header / runtime hooks 改以 active-brand runtime contract hydration，並在收到 brand refresh signal 時只重抓 brand view，不做整頁 reload。
- 保留本地 `notifyBrandChanged()` 作為同頁 optimistic feedback，但不再把它當成唯一 propagation 機制。

## Non-Goals

- 不在這個 change 內重做 Brand Assets 管理頁 UI。
- 不引入新的品牌版本歷史、排程切換或多租戶 brand policy。
- 不把所有 display runtime data 都改成 brand-specific cache busting 機制。

## Success Criteria

- Active brand 被更新、切換或 logo 變更後，其他已開啟的 playback session 會在不手動 reload 的情況下顯示最新 header brand view。
- brand refresh 不需要整頁重新載入，也不會打斷既有播放輪播狀態。
- 管理頁同分頁與跨分頁 brand 更新行為一致，沒有只在發起修改的那一頁生效。

## Impact

- Affected code:
  - Modified:
    - apps/server/src/routes/brand.ts
    - apps/server/src/realtime/SocketService.ts
    - apps/web/src/hooks/useBrandAssets.ts
    - apps/web/src/components/AppHeader.tsx
    - apps/web/src/services/socket.ts
    - apps/web/src/services/api.ts
    - apps/web/src/pages/BrandAssets/index.tsx
  - New:
    - packages/shared/src/brandRuntime.ts
  - Removed: (none)
