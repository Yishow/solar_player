## 1. Scope-aware management refresh

- [x] 1.1 Deliver `Refresh management surfaces only for relevant display sync scopes` and `Synchronize display operations state across editor, Playback Settings, and Image Management` by updating `apps/web/src/hooks/useDisplaySyncRefresh.ts` and each subscribing management surface to declare relevant scopes, and verify with `apps/web/src/pages/managementDisplaySync.test.ts` that irrelevant scopes no longer trigger reloads.
- [x] 1.2 Deliver `Route display sync through surface-specific scope filters` by keeping each page's reload logic local while the shared hook only gates relevant events, and verify through content review of `apps/web/src/pages/BrandAssets/index.tsx`, `apps/web/src/pages/MqttSettings/index.tsx`, `apps/web/src/pages/PlaybackSettings/index.tsx`, `apps/web/src/pages/ImageManagement/index.tsx`, `apps/web/src/pages/CircuitSettings/index.tsx`, and `apps/web/src/pages/DeviceStatus/index.tsx` plus the same regression tests.

## 2. Relevant draft conflict handling

- [x] 2.1 Deliver `Defer only relevant remote changes while a management draft is dirty` by updating `apps/web/src/hooks/displaySyncDraftGuard.ts` and subscribing pages so pending remote change state only appears for relevant scopes, and verify with `apps/web/src/pages/managementDisplaySync.test.ts` scenarios that unrelated sync events do not raise conflict banners.
- [x] 2.2 Deliver `Distinguish immediate refresh from deferred draft conflicts` with regression coverage, and verify using `pnpm --filter @solar-display/web test -- src/pages/managementDisplaySync.test.ts`.
