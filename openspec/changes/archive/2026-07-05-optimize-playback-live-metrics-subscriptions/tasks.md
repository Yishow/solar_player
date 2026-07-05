## 1. Shared Live Metrics Store

- [x] 1.1 Deliver **Add a shared selector-based live metrics store with `useSyncExternalStore`** so **Playback live metrics consumers subscribe through selector-scoped shared state** is observably true in `apps/web/src/hooks/liveMetricsStore.ts`; verify with `apps/web/src/hooks/liveMetricsStore.test.ts` covering selected metric updates, unrelated metric updates, and connection-only updates.
- [x] 1.2 Deliver **Keep `useLiveMetrics()` as a compatibility wrapper while adding granular hooks** so **Legacy full-snapshot consumers remain supported during selector rollout** remains true in `apps/web/src/hooks/useLiveMetrics.ts`; verify with compatibility assertions for `snapshot`, `connectionState`, `isSocketConnected`, and `lastUpdatedAt` in a targeted hook/store test.

## 2. Overview and Solar Isolation

- [x] 2.1 Deliver **Split Overview and Solar into static shells and live value-bearing subtrees** for Overview so **Overview and Solar keep static subtree output stable during value-only refresh** holds when live metrics, story payload, or weather data change; verify with updated `apps/web/src/pages/Overview/configRender.test.tsx` plus a targeted render regression test for unrelated metric updates.
- [x] 2.2 Deliver **Split Overview and Solar into static shells and live value-bearing subtrees** for Solar so **Overview and Solar keep static subtree output stable during value-only refresh** holds when live metrics or story payload change; verify with updated `apps/web/src/pages/Solar/configRender.test.ts` plus a targeted render regression test for connector and static-shell stability.

## 3. Factory Circuit Boundary

- [x] 3.1 Deliver **Retain Factory Circuit circuits/story refresh boundaries and layer selector isolation on top** so **Factory Circuit separates circuits refresh from story refresh** remains true when live metrics update without circuits or story changes; verify with updated `apps/web/src/pages/FactoryCircuit/index.test.tsx` covering live-metric-only refresh boundaries.
- [x] 3.2 Deliver **Retain Factory Circuit circuits/story refresh boundaries and layer selector isolation on top** so **Factory Circuit preserves last-known usable runtime state during refresh** still holds after the selector migration; verify with the existing fallback regression in `apps/web/src/pages/FactoryCircuit/index.test.tsx` or a new explicit stale-refresh test.

## 4. Guardrails and Verification

- [x] 4.1 Deliver **Preserve behavior-level guardrails while allowing implementation-detail test updates** so **Existing visual-guardrail tests pass without modification** remains true for output-level assertions while any retired hook-wiring assertions are replaced only with equal-or-stronger contract checks; verify by reviewing the changed source-level tests and rerunning the touched web tests.
- [x] 4.2 Deliver **Render-output invariance under performance memoization** and **Live data updates remain visible after memoization** for the completed change set; verify with `pnpm --filter @solar-display/web test`, `pnpm run build`, and `pnpm run fhd:witness -- --base-url <url>` for `/overview`, `/solar`, and `/factory-circuit`.
