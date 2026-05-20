## 1. Registry snapshot invalidation

- [ ] 1.1 Deliver `Invalidate display page registry clients after registry mutations` by updating `apps/web/src/hooks/useDisplayPageRegistry.ts` to reload on registry-relevant mutation signals, and verify with `apps/web/src/pages/shared/displayPageRouteHost.test.ts` that archived pages no longer remain active in stale client snapshots.
- [ ] 1.2 Deliver `Invalidate registry consumers after registry mutations` by confirming `apps/server/src/routes/display-page-registry.ts` emits the expected registry-relevant signals and `apps/web/src/hooks/useDisplayPageRegistry.ts` consumes them, and verify with targeted route-host and editor regression tests.

## 2. Registry-derived route and editor rebuilding

- [ ] 2.1 Deliver `Rebuild editor and route definitions from the latest registry snapshot` by updating `apps/web/src/pages/shared/displayPageRouteHost.tsx` and `apps/web/src/pages/DisplayPagesEditor/runtime.tsx` so they recompute route/editor definitions from the refreshed registry payload, and verify with `apps/web/src/pages/shared/displayPageRouteHost.test.ts` plus `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`.
- [ ] 2.2 Deliver `Recompute route and editor definitions from the latest registry snapshot` end to end, and verify using `pnpm --filter @solar-display/web test -- src/pages/shared/displayPageRouteHost.test.ts src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`.
