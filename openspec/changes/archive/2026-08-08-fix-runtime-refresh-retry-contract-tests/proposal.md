## Why

The archived runtime-sync change shipped retry logic without executable lifecycle coverage for its highest-risk timing contract. A bounded follow-up is needed to make the retry schedule, cancellation, reset, and opt-in boundary reviewable without reopening the completed product scope.

## What Changes

- Add test-first coverage for the display runtime retry contract: 2/4/8/16/32/60 second delays, success reset, cancellation on unmount or new load, and the no-page-key no-op boundary.
- Introduce only the smallest injectable scheduling seam required to test the existing hook behavior deterministically.
- Keep runtime payloads, playback UI, management surfaces, auth, Pi deployment, and unrelated dirty worktree changes unchanged.

## Non-Goals

- No new product behavior beyond making the archived retry behavior executable and reviewable.
- No changes to the archived specs, heartbeat schema, server, Device Status, or playback page composition.
- No commit; archive is the handoff boundary for the parent workflow.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code: `apps/web/src/hooks/useRuntimeRefreshLifecycle.ts` and `apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts` only, plus this bounded Spectra change.
- Verification: focused lifecycle tests, `pnpm verify`, and Standards/Spec review against the archived relocate change.
