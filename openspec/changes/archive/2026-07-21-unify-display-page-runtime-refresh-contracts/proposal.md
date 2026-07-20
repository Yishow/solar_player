## Why

五個 display pages 已經共享 draft/live config 與固定 FHD 畫布，但 story / playlist runtime 的刷新方式仍各自實作：有的只在 mount 抓一次，有的依 period 或 active index 才重抓。這種 page-local 刷新語意讓 fallback、stale、同步時機與 editor 發布後的可見性不一致。

## What Changes

- 為 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 定義共用的 runtime refresh lifecycle，而不是各頁自行決定何時重抓資料。
- 抽出 shared hook family，統一處理 bootstrap、display sync refresh、loading、stale、error 與 fallback semantics。
- 建立 page-to-source registry，明確定義每個 display page 對應哪個 runtime source、哪些參數參與 refresh key，以及哪些事件會觸發重新同步。
- 保留各頁既有的 seed fallback 與版面契約，但讓「何時同步」與「同步失敗時怎麼顯示」改為同一個系統行為。

## Capabilities

### New Capabilities

- `display-page-runtime-refresh-contracts`: 五個 display pages 以一致的 lifecycle 刷新 story / playlist runtime，並共享 stale、error、fallback 與 display-sync refresh semantics。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-runtime-refresh-contracts`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/runtimeConfigHydration.tsx
    - apps/web/src/pages/runtimeConfigHydration.test.ts
  - New:
    - apps/web/src/hooks/useDisplayStoryRuntime.ts
    - apps/web/src/hooks/useImagePlaylistRuntime.ts
    - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
    - apps/web/src/pages/runtimeRefreshRegistry.ts
  - Removed: (none)
