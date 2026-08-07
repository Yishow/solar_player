## Context

The archived `relocate-display-runtime-sync-status-to-management` change implemented opt-in retry in `useRuntimeRefreshLifecycle`, but its existing tests cover only pure state helpers and stale request identity. Timer behavior is therefore only indirectly evidenced. This follow-up is deliberately bounded to the lifecycle contract and must not reopen the archived product change.

## Goals / Non-Goals

**Goals:**

- Make the retry schedule deterministic and directly testable.
- Prove the exact 2/4/8/16/32/60 second sequence, fixed 60 second cap, reset after success, cancellation on unmount/new load, and no `runtimeSyncPageKey` no-retry/no-report behavior.
- Preserve the current runtime behavior and keep the implementation seam minimal.

**Non-Goals:**

- No changes to server, heartbeat, reporter schema, playback pages, auth, Pi, or management UI.
- No broad refactor of the hook or replacement of the test runner.

## Decisions

### Injectable scheduling seam

Use an optional internal scheduler seam for the hook's delayed retry, defaulting to the existing global `setTimeout`/`clearTimeout` behavior. Tests inject a deterministic scheduler through the hook options or a narrowly scoped test seam, allowing exact delay assertions without sleeping. The production default remains unchanged.

### Contract-level lifecycle tests

Exercise the hook with the repository's existing React test approach and fake scheduling. Tests must drive rejected loads and scheduler callbacks, then assert load count, scheduled delays, reporter snapshots, and cleanup. Pure helper tests remain unchanged.

### Preserve archived scope

This change is a test-contract repair. If implementation correction is necessary, it may only make the existing archived behavior observable and correct at the lifecycle boundary; no adjacent product behavior may be added.

## Implementation Contract

**Behavior**

- With a `runtimeSyncPageKey`, a rejected load schedules retries at exactly 2, 4, 8, 16, 32, then 60 seconds; subsequent failures remain at 60 seconds.
- A successful retry resets the sequence so the next failure schedules 2 seconds.
- A new load cancels a pending retry; unmount cancels a pending retry and no callback starts another load.
- Without `runtimeSyncPageKey`, failed loads neither schedule retries nor write runtime sync reports.

**Interface / data shape**

- The production hook signature remains backward-compatible: existing callers without `runtimeSyncPageKey` continue to work.
- Any scheduler seam is optional and test-oriented; production defaults preserve `setTimeout` and `clearTimeout` semantics.

**Failure modes**

- A stale or cancelled retry must not mutate state or invoke `load` after cleanup.
- Tests must not rely on wall-clock sleeps or leave timers pending.

**Acceptance criteria**

- `apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts` directly proves all listed timing and lifecycle cases.
- Focused web tests pass.
- `pnpm verify` passes.
- `spectra analyze fix-runtime-refresh-retry-contract-tests --json` has no critical findings.
- Review confirms no unrelated files are included in this change.

**Scope boundaries**

- In scope: lifecycle hook and its focused tests, plus this change's artifacts.
- Out of scope: all other dirty files, archived change artifacts, server/runtime payloads, auth, Pi, deployment, and commits.

## Risks / Trade-offs

- [Risk] A test seam could accidentally become product API. → Keep it optional, internal/test-only in naming and default behavior.
- [Risk] Shared dirty worktree could contaminate verification. → Review and report only the two lifecycle files and this change directory; do not stage or commit.
