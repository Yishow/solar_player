# Combined runtime proof — 2026-08-08

## Requirement matrix

| Requirement | Fresh proof | Result |
| --- | --- | --- |
| Unpaired display denials are observable without changing display liveness | `openspec/changes/archive/2026-08-08-surface-unpaired-display-access-in-management/evidence/runtime-proof-2026-08-08.md`; server test `device status exposes denied display access without changing display client liveness` | Pass: runtime denial is HTTP 401; status reports `totalCount=1` while display client total remains 0. |
| Heartbeats carry runtime sync state and management renders it | `pnpm verify` web/server suites, including heartbeat and Device Status tests | Pass: server 622 and web 952 tests passed. |
| Untrusted password bootstrap is denied while gate is disabled | `apps/server/src/routes/management-auth.test.ts`, test `untrusted callers cannot bootstrap the management password gate` | Pass: evil origin receives HTTP 403 and persisted gate state remains disabled. |
| Trusted bootstrap remains available | `apps/server/src/routes/management-auth.test.ts`, test `trusted same-host caller can bootstrap the management password gate` | Pass: same-host localhost receives HTTP 200 and gate becomes enabled. |
| Latest tree satisfies repository verification | `/private/tmp/solar-player-final-verify-2026-08-08.log` | Pass: build, bundle-budget, server, web, deploy, and server-runner stages all passed. |

## Security boundary proof

The password mutation route now calls the shared `isTrustedManagementMutationRequest` classifier before state mutation. The check applies in both gate states; it does not rely on a client hook or CORS as the security boundary. The route-specific password validation and session revocation remain unchanged.

## Spec/archive proof

- `openspec/changes/archive/2026-08-08-surface-unpaired-display-access-in-management/` was re-archived without `--skip-specs`; CLI reported both affected main specs applied.
- `openspec/changes/archive/2026-08-08-harden-management-password-gate-origin-boundary/` was archived with `management-api-access-boundaries` synced to main.
- `spectra validate --all --strict` passed after the final archive.
