# Phase 1 Multisite Playback Acceptance Evidence

## Evidence scope

- Date: 2026-07-30 (Asia/Taipei)
- Fixed point before this change: `d472a00c1e6b8c1530270599c28c2d4c31110e61`
- Host: Darwin arm64, kernel 25.5.0
- Node: v24.15.0
- pnpm: 10.33.2
- Test topology: one isolated Server on loopback with temporary SQLite
- Cohort: 25 CL plus 25 KN Devices sharing one Default Playback Profile

The automated load evidence proves the repository contract on this host. It
does not replace an installed Pi read-back, production CL/KN operator-data
witness, or the user's launch decision.

## Code review

- Standards review: PASS after fixing credential transport, evaluator metrics,
  lifecycle coverage, child cleanup, reconnect observation, environment
  documentation, and runtime credential-safety testing.
- Spec review: PASS after proving the shared Profile/settings, five-Client
  simultaneous reconnect, duplicate-identity state, per-Client Profile sync,
  and exact evidence wording.
- `git diff --check`: PASS.

## Automated gates

| Command | Result |
|---|---|
| `node --test scripts/device-scoped-playback-load.test.mjs` | PASS, 5/5 |
| `node --test scripts/deploy.test.mjs` | PASS, 97/97 |
| `pnpm test` | PASS |
| `pnpm build` | PASS |
| `pnpm verify` | PASS, all stages |
| `spectra analyze phase1-multisite-playback-acceptance` | PASS, Coverage/Consistency/Ambiguity/Gaps all Clean |

The deployment suite includes controlled named-failure fixtures for Profile,
Cookie persistence, remote Server reachability, immediate Time Signal, Device
identity heartbeat, Time Sync State, and a real Python/HTTP-recorder test that
proves Device and management credentials are not sent over remote plaintext
HTTP.

## Required 50-Client run

Command:

```bash
pnpm run verify:device-scoped-playback
```

The public command accepted no Client, duration, or reconnect overrides. It ran
the fixed 50-Client, 600,000 ms, five-simultaneous-reconnect contract and exited
zero with:

```json
{"clients":50,"durationMs":600000,"heartbeats":3000,"peakConnections":50,"reconnects":5,"rotationEvaluations":2,"timeSignals":1055,"failureDetails":[],"failures":0}
```

The run also asserted through public seams:

- all 50 Devices were created and paired;
- CL and KN shared one Profile and identical settings while receiving isolated
  Site Story/runtime context;
- unpaired, disabled, revoked, old-credential, and re-paired outcomes failed or
  recovered as specified;
- the other 49 Clients stayed connected during the credential lifecycle;
- all five reconnect targets disconnected and reconnected as one batch;
- every Device heartbeat read back its identity, route, page, and synced time;
- no Client reported a duplicate identity after reconnect;
- every distinct Client received the same complete Profile sync payload;
- active connections peaked and settled at 50.

## Launch acceptance boundary

Automated repository acceptance is complete. Before production launch, the
operator evidence still needs:

1. the installed Pi verifier after a controlled Firefox restart or reboot;
2. production CL/KN Device, Group, Site, Profile, Story, and runtime read-back;
3. confirmation of any on-site network or deployment differences.

The user accepted launch readiness with these on-site boundaries on 2026-07-30.
