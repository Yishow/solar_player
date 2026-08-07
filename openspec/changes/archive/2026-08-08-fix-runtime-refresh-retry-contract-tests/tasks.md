## 1. Retry lifecycle contract

- [x] 1.1 Apply the injectable scheduling seam and prove with a deterministic scheduler that an enabled `runtimeSyncPageKey` schedules rejected loads at 2/4/8/16/32/60 seconds and remains capped at 60 seconds; verify with focused tests in `apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts` before implementation changes.
- [x] 1.2 Use contract-level lifecycle tests to prove that a successful retry resets the backoff to 2 seconds and that a new load cancels the pending retry; verify load counts and scheduled delays in the focused lifecycle tests.
- [x] 1.3 Prove that unmount cancels a pending retry and that omitting `runtimeSyncPageKey` schedules no retry and writes no runtime report; verify cleanup and reporter assertions in the focused lifecycle tests.

## 2. Verification and handoff

- [x] 2.1 If the contract tests expose a defect, apply only the minimal lifecycle correction while preserving archived scope; verify focused web tests and `pnpm verify`.
- [x] 2.2 Preserve archived scope while confirming `spectra analyze fix-runtime-refresh-retry-contract-tests --json` has no critical findings and reviewing the scoped diff against the Implementation Contract; verify no unrelated files are changed by this fix.
