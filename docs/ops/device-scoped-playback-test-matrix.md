# Device-scoped Playback Phase 1 Test Matrix

This is the repeatable acceptance matrix for one Server and about 50 paired
Clients. It complements, but does not replace, on-site launch acceptance.

## Commands

Fast harness self-tests:

```bash
node --test scripts/device-scoped-playback-load.test.mjs
```

Required Phase 1 load run:

```bash
pnpm run verify:device-scoped-playback
```

The command starts an isolated Server on a reserved loopback port with a
temporary SQLite database and removes it afterward. It must not point at or
modify operator data. It uses only Management API, Pairing, authenticated
Story/Rotation, Socket, heartbeat, and status seams.

The public command fixes the acceptance contract at 50 Clients, 600 seconds,
and five reconnects. It rejects Client, duration, and reconnect overrides so a
short smoke run cannot be mistaken for Phase 1 acceptance. Use the fast
self-tests above for development feedback.

The final stdout line is JSON and always includes:

```json
{
  "clients": 50,
  "heartbeats": 3000,
  "timeSignals": 1055,
  "rotationEvaluations": 2,
  "reconnects": 5,
  "failures": 0,
  "peakConnections": 50
}
```

The example shows the expected output shape, not acceptance evidence. Scheduling
can affect exact counts, so the required minimums and maximums below plus
`failures: 0` are the contract.
Any fixture failure, missing metric, threshold violation, unhandled failure, or
non-zero `failures` makes the process exit non-zero.

## Thresholds

For fixed `clients=C=50`, duration `D=600,000` milliseconds, and
`reconnects=R=5`:

- Heartbeats: at most `C × (1 + floor(D / 10,000))`.
- Time Signals: at most `C + R + C × ceil(D / 30,000)`; the first `C + R`
  accounts for an immediate signal on initial/reconnected sockets.
- Minimum heartbeat evidence: at least `C`, one from every Client.
- Minimum Time Signal evidence: at least `C + R`, one from every initial and
  reconnected Socket.
- Full rotation evaluations: exactly 2, one unchanged Profile cohort for CL
  and one for KN.
- Peak active connections: exactly `C`.
- Settled active connections after reconnect: exactly `C`.

The baseline is 25 CL plus 25 KN Devices sharing two Site cohorts and a common
Default Profile. Do not lower the Client or duration values and call it Phase 1
acceptance.

## Correctness and lifecycle matrix

| ID | Seam/action | Expected observable |
|---|---|---|
| C01 | create CL and KN Groups through `POST /api/device-groups` | HTTP 201; `siteScope` remains `cl`/`kn` |
| C02 | create 50 Devices through `POST /api/devices` | 50 stable unique `clientId`; at least 25 per Site |
| C03 | issue/exchange token for each Device | HTTP 201 then 204; each receives an HttpOnly credential Cookie |
| C04 | request CL Story and `/api/playback/runtime` | CL page/context; `siteScope=cl` |
| C05 | request KN Story and `/api/playback/runtime` | KN page/context; `siteScope=kn` |
| C06 | add a conflicting Site query parameter | credential-owned Site still wins |
| C07 | same Profile across CL/KN | common Profile settings, Site-sensitive Story remains isolated |
| C08 | unpaired Story request | HTTP 401, `device_unpaired` |
| C09 | disable one Device | its request is HTTP 403, `device_disabled`; other Clients unaffected |
| C10 | revoke one credential | old credential fails closed with `credential_revoked` |
| C11 | re-pair revoked Device | new credential resumes same Group/Site; old credential remains rejected |
| C12 | connect all Sockets | 50 authenticated connections and immediate Time Signal per connection |
| C13 | send heartbeat | `/api/device/status` exposes Device identity and `timeSyncState` |
| C14 | reconnect five Clients | connections settle at 50; no duplicate false-positive growth |
| C15 | update the shared Profile | every connected Client receives the same `playback:settingsUpdated` payload |

The load command covers C01–C15. A failure must name the rejected public
operation or unavailable metric and exit non-zero.

## Rate and resource matrix

| ID | Ten-minute condition | Pass condition |
|---|---|---|
| R01 | 50 Clients emit heartbeat every 10 seconds | heartbeat count does not exceed formula |
| R02 | Server broadcasts every 30 seconds | Time Signal count does not exceed formula |
| R03 | no Profile/Site revision change | `rotationEvaluations <= 2` |
| R04 | five controlled reconnects | `peakConnections <= 50` and settled count is 50 |
| R05 | complete run | `failures=0`, no unhandled rejection or event storm |

The harness bounds connection entries; it is not a heap profiler. A suspected
memory leak requires a separate long-running diagnostic rather than relaxing
these thresholds.

## Installed thin-kiosk matrix

Run after Firefox restart or the reboot witness, with an HTTPS overview URL and
a temporary mode-600 management token file:

```bash
sudo test "$(stat -c '%a' /run/solar-phase1-management-token)" = 600
sudo ~/solar-player-thin/deploy/verify-thin-kiosk.sh \
  --kiosk-user "<kiosk-user>" \
  --kiosk-url "https://<windows-server-tls-host>/overview" \
  --management-token-file "/run/solar-phase1-management-token"
sudo rm -f /run/solar-phase1-management-token
```

| ID | Named verifier check | Pass condition |
|---|---|---|
| K01 | dedicated Firefox Profile | directory exists, owner/mode correct, launcher selects it |
| K02 | no private-window | launcher contains no private-window flag |
| K03 | Cookie restart persistence | credential is read from dedicated Profile after restart |
| K04 | remote Server reachability | `/health` returns HTTP 200 |
| K05 | immediate Time Signal | Socket receives valid `server:time` for `Asia/Taipei` |
| K06 | heartbeat Device identity | management status finds the same `deviceId` |
| K07 | heartbeat Time state | status reports `timeSyncState=synced` |
| K08 | result | all checks `OK`, final `Thin-kiosk verification PASSED.`, exit 0 |

The probe reads `cookies.sqlite` in read-only mode and must not print the
credential. It does not read or send either credential over unsafe non-loopback
HTTP. Missing token file, unsafe transport, unreachable Server, missing Cookie,
missing Time Signal, or absent heartbeat field produces a named failure and
non-zero exit.

## Repository gates

Run after focused fixes:

```bash
node --test scripts/device-scoped-playback-load.test.mjs
node --test scripts/deploy.test.mjs
pnpm test
pnpm build
pnpm verify
spectra analyze phase1-multisite-playback-acceptance
```

`pnpm test` remains the fast development suite and does not run the 10-minute
load. `pnpm verify` is the repository delivery gate. The explicit
`pnpm run verify:device-scoped-playback` command is the Phase 1 capacity gate.

Record command, commit, host/Node versions, start/end time, full JSON metrics,
thin-kiosk named checks, and any on-site differences. Only the user can accept
launch readiness; green automation alone does not authorize archive or launch.
