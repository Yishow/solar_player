# Device Pairing and Recovery

Use this runbook to pair one kiosk, prove its identity and App Time after a
Browser restart/reboot, or recover an offline, disabled, expired, or revoked
Device. It applies to the Windows Server + Pi thin-kiosk topology. For install
steps, first complete the Windows and Pi runbooks linked from `deploy.md`.

## Operation values and security boundary

Set values for this operation; do not commit them:

```bash
SERVER_ORIGIN="https://<windows-server-tls-host>"
KIOSK_URL="${SERVER_ORIGIN}/overview"
KIOSK_USER="<pi-kiosk-user>"
DEVICE_ID="<numeric-device-id>"
TOKEN_FILE="/run/solar-phase1-management-token"
```

Use HTTPS for a remote kiosk. Pairing rejects non-loopback HTTP. A Pairing Token
is valid once for 15 minutes. Treat it as a short-lived secret; do not put it in
shell history, logs, screenshots, tickets, or a URL query. The resulting Device
Credential is an HttpOnly Cookie in the dedicated Firefox Profile and must never
be printed or copied.

`MANAGEMENT_ACCESS_TOKEN` is a separate administrator secret. On the Pi create a
root-readable, mode-600 temporary file without echoing the token:

```bash
read -rsp "Management token: " MANAGEMENT_TOKEN; printf '\n'
printf '%s' "${MANAGEMENT_TOKEN}" \
  | sudo tee "${TOKEN_FILE}" >/dev/null
unset MANAGEMENT_TOKEN
sudo chmod 600 "${TOKEN_FILE}"
sudo test "$(stat -c '%a' "${TOKEN_FILE}")" = 600
```

Delete it immediately after verification:

```bash
sudo rm -f "${TOKEN_FILE}"
```

The verifier will not read or send either the Device Credential or management
token over non-loopback HTTP. In that case its named identity/time checks fail
closed.

## Create the Group and Device

Preferred operator surface: open the trusted management route
`<SERVER_ORIGIN>/device-fleet`.

1. Create or select an enabled Group.
2. Set Site exactly to `cl` or `kn`.
3. Confirm the Group shows the intended Playback Profile. The Phase 1
   management surface assigns the Default Profile.
4. Create an enabled Device with a unique `clientId` and assign that Group.

Expected observable: the Device Fleet row shows the Device identity, Group,
Site, Profile, enabled state, and `未配對`.

The exact API seams are:

- `POST /api/device-groups` with `{name, enabled, siteScope,
  playbackProfileId?}` → HTTP 201, `data.id`, `data.siteScope`, and a Profile.
- `POST /api/devices` with `{clientId, displayName, enabled, groupId}` →
  HTTP 201, `data.id`, `data.group.siteScope`, and `data.paired: false`.
- `GET /api/devices/:id` → HTTP 200 and the persisted Group/Site/Profile
  assignment; it exposes only `paired`, never a credential.

If a Group was created without `playbackProfileId`, the current Default Profile
is selected. Do not rely on this default when correcting an ambiguous production
assignment: read the Device back before issuing a Pairing Token.

## Pair the kiosk

1. In `/device-fleet`, select the Device and issue a one-time pairing link.
   The API seam is `POST /api/devices/:id/pairing-tokens` → HTTP 201 with
   `data.expiresAt`, `data.pairingPath`, and the one-time token. The displayed
   path carries the token only in `#token=...`; URL fragments are not sent in
   the HTTP request, and the landing page clears the fragment before exchange.
2. On the kiosk's dedicated Firefox Profile, open the copied fragment-only
   pairing link. When using the RDP/manual path instead, open the token-free
   `<SERVER_ORIGIN>/device-pairing`, paste only the token, and select **配對**.
   Do not use private mode or change the fragment to a query parameter.

The browser submits `POST /api/device-pairing/exchange`. Expected observable:
HTTP 204, an HttpOnly `solar_device_credential` Cookie, and redirect to
`/overview`. The pairing page never needs to display the credential.

Read back in the same Firefox Profile:

```text
<SERVER_ORIGIN>/api/device-pairing/status
```

Expected: HTTP 200 JSON with `success: true`, `data.paired: true`, and the
expected `deviceId`/`clientId`. This response intentionally omits Group, Site,
Profile, token, and credential.

## Prove production CL/KN Site isolation

Use one paired CL kiosk/Profile and one paired KN kiosk/Profile. In
`/device-fleet`, first confirm both Device rows show the same Playback Profile
and different Sites. Then open these URLs in each kiosk's own dedicated
Profile; the HttpOnly credential is supplied by that browser:

| Kiosk | URL | Expected observable |
|---|---|---|
| CL | `<SERVER_ORIGIN>/api/playback/runtime?siteScope=kn` | HTTP 200; `context.siteScope` remains `cl`; Group/Profile match the CL Device |
| CL | `<SERVER_ORIGIN>/api/display-story/factory-circuit` | HTTP 200; `pageId=factory-circuit` |
| CL | `<SERVER_ORIGIN>/api/display-story/factory-circuit-guanyin` | HTTP 403, `site_scope_mismatch` |
| KN | `<SERVER_ORIGIN>/api/playback/runtime?siteScope=cl` | HTTP 200; `context.siteScope` remains `kn`; Group/Profile match the KN Device |
| KN | `<SERVER_ORIGIN>/api/display-story/factory-circuit-guanyin` | HTTP 200; `pageId=factory-circuit-guanyin` |
| KN | `<SERVER_ORIGIN>/api/display-story/factory-circuit` | HTTP 403, `site_scope_mismatch` |

Record both runtime `context` objects and the Device Fleet Profile names. Do
not copy an HttpOnly Cookie into `curl`; the browser read-back proves the
credential-owned Site against the actual operator database.

## Restart/reboot witness and Phase 1 verifier

Do not run the live identity verifier only before a restart. For a controlled
Browser witness, restart the display manager so autologin launches the installed
wrapper in the correct graphical session, then wait for Firefox and `/overview`:

```bash
sudo pkill -TERM -u "${KIOSK_USER}" firefox || true
sudo systemctl restart lightdm
for i in $(seq 1 30); do
  pgrep -u "${KIOSK_USER}" firefox >/dev/null && break
  sleep 3
done
pgrep -u "${KIOSK_USER}" firefox >/dev/null
```

For a full reboot witness, record `uptime -s`, run `sudo reboot`, wait for SSH
to return, and require a different `uptime -s`. Then require:

```bash
systemctl is-active --quiet solar-device-agent lightdm
systemctl is-enabled --quiet solar-device-agent
pgrep -u "${KIOSK_USER}" firefox
```

Only after the Browser restart or all reboot checks pass, run from any Pi
working directory using the installed handoff path:

```bash
sudo ~/solar-player-thin/deploy/verify-thin-kiosk.sh \
  --kiosk-user "${KIOSK_USER}" \
  --kiosk-url "${KIOSK_URL}" \
  --management-token-file "${TOKEN_FILE}"
```

Required named observables:

```text
OK: dedicated Firefox profile selected
OK: launcher does not use private-window
OK: kiosk URL matches expected remote server
OK: Phase 1 cookie persists across Browser restart
OK: Phase 1 remote Server is reachable
OK: Phase 1 immediate Time Signal received
OK: Phase 1 heartbeat includes Device identity
OK: Phase 1 heartbeat includes Time Sync State
Thin-kiosk verification PASSED.
```

The live probe opens the dedicated Profile's `cookies.sqlite` read-only without
printing the credential, calls `/health`, authenticates Socket.IO, receives an
immediate `server:time`, sends one heartbeat, then reads `/api/device/status`
with the management token. Any missing check makes the command exit non-zero.
Delete `TOKEN_FILE` after the result is recorded.

## Diagnose an offline Device

Open:

- `/device-fleet`: fleet identity and operational state.
- `/device-status`: connection count, last heartbeat, page/route, and
  `timeSyncState`.
- `GET /api/devices/:id`: persistent enabled, Group, Site, Profile, and paired
  state.
- `GET /api/device/status`: current display-client liveness.

Interpretation:

| Observable | Meaning | Action |
|---|---|---|
| `paired: false` | no active credential | run the pairing flow |
| paired + `離線` / no live connection | credential exists, but no authenticated Socket heartbeat | verify `/health` from Pi, kiosk URL, Firefox process/Profile, TLS/DNS/firewall, then rerun the verifier |
| multiple connections | more than one authenticated session for one Device | close duplicate Firefox/RDP sessions; wait for connection count to settle |
| `waiting` | no valid Time Signal yet | verify Socket path and Server availability |
| `stale` | no valid Time Signal for more than 90 seconds | diagnose Socket/reconnect path |
| `time-untrusted` | no valid Time Signal for at least 30 minutes | restore Server/Socket; absolute-time playback remains frozen |

Network checks:

```bash
curl -fsS "${SERVER_ORIGIN}/health"
curl -fsS -H 'Accept: text/html' -o /dev/null \
  -w 'overview=%{http_code}\n' "${KIOSK_URL}"
systemctl is-active solar-device-agent lightdm
pgrep -u "${KIOSK_USER}" firefox
```

Expected: health JSON with `status: ok`, `overview=200`, both services active,
and a Firefox PID. A local PC health success with Pi failure points to
TLS/DNS/firewall/routing, not the Device assignment.

## Diagnose disabled or rejected identity

Open the status URL in the same dedicated Profile:

```text
<SERVER_ORIGIN>/api/device-pairing/status
```

Map the response:

| Code | HTTP | Meaning and recovery |
|---|---:|---|
| `credential_missing` | 401 | no Cookie in this Profile; pair |
| `credential_invalid` | 401 | unknown/malformed Cookie; pair, do not edit Cookie storage |
| `credential_expired` | 401 | credential lifetime ended; issue a new token and pair |
| `credential_revoked` | 401 on status; protected playback is fail-closed | complete the already-authorized re-pair flow |
| `device_disabled` | 403 | confirm operator intent, enable Device, read back, then pair if needed |
| `group_disabled` | 403 | verify Group Site/Profile, enable Group, read back |
| `group_missing` | 403 | assign an enabled Group with Site and Profile |

On `/device-fleet`, enabling a Device or Group is an operator decision. Expected
after correction: `GET /api/devices/:id` shows the Device and Group enabled with
the intended `siteScope` and Playback Profile. Do not issue a token before this
read-back.

## Revoke and re-pair

Use this for a replaced Pi/Profile or suspected credential disclosure.

1. Prove that the kiosk/RDP recovery channel is available.
2. Read back the Device assignment and enabled states.
3. Issue a new Pairing Token.
4. Revoke the old credential with
   `POST /api/devices/:id/credentials/revoke`.
5. Expected: HTTP 200 and `data.revokedCount: 1`; an idempotent retry may return
   `0`.
6. In the old Profile, the status/playback request now returns
   `credential_revoked`.
7. In the dedicated Profile, open the token-free `/device-pairing` page and
   submit the fresh token. Expected: `/overview`, then status HTTP 200 with the
   same Device identity.
8. Restart Firefox and rerun the Phase 1 verifier.

Exchanging the new token invalidates any other active credential for that
Device. Other Devices and the other Site must remain connected and unchanged.
Clear clipboard/token material and delete the mode-600 management token file.

## Pairing Token failures

| Code | Expected result | Recovery |
|---|---|---|
| `pairing_token_invalid` | pairing rejected | clear input and issue a new token |
| `pairing_token_expired` | pairing rejected after 15 minutes | issue a new token |
| `pairing_token_used` | repeat exchange rejected | verify status in the Profile that consumed it; otherwise issue a new token |
| management request denied | no token issued | restore trusted management origin or correct `MANAGEMENT_ACCESS_TOKEN`; never weaken the Server boundary |

Never disable TLS validation, enable private browsing, copy a credential between
Profiles, expose the management token in a URL, or hand-edit SQLite as a
recovery shortcut.
