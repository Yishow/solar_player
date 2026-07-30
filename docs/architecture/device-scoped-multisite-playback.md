# Device-scoped Multi-site Playback Architecture

This document is the Phase 1 architecture handoff for one Solar Player Server
serving about 50 paired display Clients across the CL and KN Sites. Operational
pairing and recovery steps live in
[`docs/ops/device-pairing-and-recovery.md`](../ops/device-pairing-and-recovery.md);
the acceptance matrix lives in
[`docs/ops/device-scoped-playback-test-matrix.md`](../ops/device-scoped-playback-test-matrix.md).

## Vocabulary and ownership

| Term | Meaning | Source of truth |
|---|---|---|
| Server | The Windows or Linux process that owns SQLite, Management APIs, Playback APIs, Socket.IO, MQTT ingestion, and App Time | one deployed `apps/server` runtime |
| Client | A browser playback session. In split topology this is Firefox on a Pi thin kiosk | the authenticated Socket/browser session |
| Device | Stable managed identity with unique `clientId`, display name, enabled state, and one Group assignment | `devices` |
| Group | Assignment boundary that owns enabled state, `siteScope`, and Playback Profile | `device_groups` |
| Site | Data isolation key. Phase 1 accepts only `cl` or `kn` | `device_groups.site_scope` |
| Playback Profile | Reusable playback settings and page membership | `playback_profiles` and profile-owned tables |
| Pairing Token | 32-byte random, one-time, 15-minute bootstrap secret | only its SHA-256 hash is stored in `pairing_tokens` |
| Device Credential | 32-byte random, one-year browser credential stored as an HttpOnly Cookie | only its SHA-256 hash is stored in `device_credentials` |
| App Time | Server-host wall clock accepted by Clients and advanced with a Client monotonic timer | `server:time` Socket signal |
| Liveness | Server-side aggregate of authenticated connections and their latest heartbeat | `/api/device/status` |

The chain is:

```text
Device Credential
  → Device
    → Group
      → Site Scope (cl | kn)
      → Playback Profile
        → effective rotation and page settings
```

The browser does not select its Device, Group, Site, or Profile with query
parameters. The Server resolves all four from the credential on every protected
playback request and Socket connection.

## Public request flow

1. An operator creates or selects a Group through `/device-fleet` or
   `POST /api/device-groups`, with `siteScope` equal to `cl` or `kn`.
2. The operator creates a Device through `/device-fleet` or
   `POST /api/devices`, assigning the Group.
3. `POST /api/devices/:id/pairing-tokens` issues a one-time token.
4. The kiosk opens `/device-pairing`, submits the token to
   `POST /api/device-pairing/exchange`, and receives an HttpOnly
   `solar_device_credential` Cookie. The token is then consumed.
5. Protected requests such as `GET /api/playback/runtime` and
   `GET /api/display-story/:pageId` resolve the credential-owned context.
6. The authenticated Socket receives an immediate `server:time`, playback
   updates, and sends `client:heartbeat`.
7. Management read-back uses `GET /api/devices` for persistent identity and
   `GET /api/device/status` for live connections, page/route, and
   `timeSyncState`.

Expected successful runtime context:

```json
{
  "context": {
    "deviceId": 12,
    "clientId": "lobby-cl-01",
    "groupId": 3,
    "profileId": 1,
    "siteScope": "cl",
    "contextRevision": "<opaque hash>"
  }
}
```

`contextRevision` is opaque. Clients compare it for change; operators and
integrations must not construct or parse it.

## Site isolation

CL and KN may share the same Playback Profile. Sharing a Profile means common
playback settings, not shared Site data:

- `siteScope=cl` resolves the CL Factory Circuit story
  (`factory-circuit`).
- `siteScope=kn` resolves the KN Factory Circuit story
  (`factory-circuit-guanyin`).
- Effective rotation is evaluated per Profile-plus-Site cohort. Fifty Devices
  do not require fifty full evaluations when the Profile and Site revisions are
  unchanged.
- Updating, disabling, revoking, or re-pairing one Device does not mutate the
  other Site or another Device's settings.

A caller cannot escape its Site by adding `?siteScope=kn`. Protected playback
uses the credential context. The acceptance harness proves this through the
public Management API → pairing → Story/Rotation/Socket path; it does not call
private services or inspect a production database.

## Fail-closed identity lifecycle

| Condition | Protected playback outcome | Operator action |
|---|---|---|
| Cookie absent or invalid | HTTP 401, `device_unpaired` | issue a new Pairing Token and pair |
| Credential expired | HTTP 401, `credential_expired` | issue a new Pairing Token and pair |
| Credential revoked | HTTP 403, `credential_revoked` | pair with a newly issued token |
| Device disabled | HTTP 403, `device_disabled` | confirm intent; enable Device before re-pairing |
| Group disabled | HTTP 403, `group_disabled` | confirm Site/Profile, then enable Group |
| Group assignment incomplete | HTTP 403, `group_missing` | assign an enabled Group with Site and Profile |
| Profile unavailable | HTTP 403, `profile_missing` | restore a valid Playback Profile assignment |

Exchanging a new Pairing Token revokes every still-active credential for that
Device before inserting the replacement. Old browser sessions therefore fail
closed. Never copy a credential, query `cookies.sqlite` manually, or move a
Firefox Profile between Devices.

## Server-authoritative App Time

The Server host clock is the product wall-clock authority. A connection receives
one immediate `server:time` signal and then at most one periodic signal every 30
seconds. The signal includes `timeZone=Asia/Taipei`, a process instance, and an
ordered sequence. Clients advance the accepted baseline with a monotonic timer;
they do not fall back to the kiosk OS Clock.

Client states are:

- `waiting`: no valid signal received.
- `synced`: a valid signal was received within 90 seconds.
- `stale`: older than 90 seconds but younger than 30 minutes.
- `time-untrusted`: at least 30 minutes old; absolute-time behavior freezes.

Heartbeat read-back includes Device identity and `timeSyncState`. Correct the
Server host clock with the operator-selected OS time service, then restart the
Server after a forward/backward correction so a new time process instance is
created. Solar Player never changes either host's OS Clock, timezone, or NTP.
See [`server-app-time.md`](server-app-time.md).

## Persistence, migration, and compatibility

Server startup runs migrations before seed. Phase 1 builds on:

- 027: idempotent Default Playback Profile and profile-owned settings/pages.
- 028: singleton global playback runtime policy.
- 029: `device_groups` and `devices`; existing databases receive no fabricated
  field Device records.
- 030: hashed Pairing Tokens and Device Credentials.

Take a database backup before deploying a new Server release. Do not copy the
operator database into the acceptance harness: `pnpm run
verify:device-scoped-playback` creates and removes its own temporary SQLite
database.

Compatibility rules:

- Existing `GET/PUT /api/playback/settings`, `/api/playback/pages`, and
  `/api/playback/rotation-plan` remain the Default Profile façade.
- An existing unpaired browser does not silently become a Device; protected
  device-scoped playback returns `device_unpaired` until it is explicitly
  paired.
- Legacy co-located Pi deployment remains supported. Split topology is an
  additive deployment mode, not an in-place schema fork.
- `display_page_registry` playback columns remain compatibility remnants;
  profile-owned tables are the production playback source of truth.
- Rollback must restore a Server release compatible with the already migrated
  SQLite database and its backup. Do not delete migration rows or hand-edit
  credential tables.

## Deployment topology

### Windows Server and Pi thin kiosk

```text
Windows PC
  SolarPlayerServer service (nssm)
  SQLite + MQTT + Management + Playback + Socket/App Time
           │ HTTPS/LAN
           ▼
Pi thin kiosk
  lightdm + dedicated persistent Firefox Profile
  solar-device-agent (bounded host stats)
  no local solar-display.service
```

Use [`docs/runbooks/pc-server-deploy.md`](../runbooks/pc-server-deploy.md) for
the Windows Server and
[`docs/runbooks/pi-thin-kiosk-deploy.md`](../runbooks/pi-thin-kiosk-deploy.md)
for the Pi. The Pi installer writes only runtime-necessary thin-kiosk files; it
does not copy the full repository or install `/data/solar-display`.

The preferred kiosk origin is HTTPS. Pairing transport rejects an unsafe
non-loopback HTTP origin. The Server firewall/reverse proxy must allow `/health`,
the playback routes, `/device-pairing`, `/api`, and `/socket.io` from the kiosk
network.

### Co-located Pi

The existing `/data/solar-display` service plus local kiosk remains a separate
supported topology. Do not apply thin-kiosk verification to it. Migration to
split topology stops and disables (but does not delete) the old service so the
operator can roll back using the Pi runbook.

## Capacity contract

The Phase 1 acceptance baseline is 50 Clients: at least 25 CL and 25 KN,
10-second heartbeat cadence, 30-second periodic App Time, five controlled
reconnects, and a 10-minute steady-state window. Passing proves the repository's
bounded single-host contract under the recorded test environment; it is not a
substitute for on-site LAN, TLS, power, display, or launch acceptance.

Run and interpret it using
[`device-scoped-playback-test-matrix.md`](../ops/device-scoped-playback-test-matrix.md).
