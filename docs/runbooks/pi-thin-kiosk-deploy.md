# Pi Thin-Kiosk Deploy (Split Topology)

Turn a Raspberry Pi 5 into a **browser-only** kiosk that opens a remote Solar Player server on a Windows PC. The Pi does **not** run Node, SQLite, or `solar-display.service`.

## Supported Target

- Raspberry Pi 5, Ubuntu 24.04 arm64.
- Graphical stack: XFCE + lightdm + Firefox + xrdp (same lightweight desktop as co-located kiosks).
- Default kiosk user: `pi` (override with `--kiosk-user`).

## Operation-Time Values

```bash
PI_HOST="<pi-host-or-magicdns>"
PI_USER="<pi-ssh-user>"
SSH_TARGET="${PI_USER}@${PI_HOST}"
PC_IP="<windows-server-lan-ip>"
PC_BACKEND_PORT="4000"
PC_ORIGIN="https://<windows-server-tls-host>"
KIOSK_URL="${PC_ORIGIN}/overview"
KIOSK_USER="pi"
KIOSK_HOME="$(ssh "${SSH_TARGET}" "getent passwd '${KIOSK_USER}' | cut -d: -f6")"
test -n "${KIOSK_HOME}"
```

## Prerequisites

### A. PC server minimum self-check (before touching the Pi)

The PC backend may remain on loopback port `4000`, but remote pairing and
playback require an HTTPS origin. Terminate TLS at a reverse proxy, forward to
`http://127.0.0.1:4000`, and preserve both `X-Forwarded-For` and
`X-Forwarded-Proto`. In the PC server `.env`, trust only the proxy's exact source
IP; for a same-host proxy:

```env
TRUST_PROXY_IPS=127.0.0.1,::1
```

Restart the PC service after changing `.env`. The hostname in `PC_ORIGIN` must
resolve from the Pi and its certificate must be trusted by Firefox. Plain remote
HTTP pairing fails with `pairing_https_required`.

From **any** client that will use the kiosk origin (including the Pi):

```bash
PC_ORIGIN="https://<windows-server-tls-host>"
curl -fsS "${PC_ORIGIN}/health"
curl -fsS -H 'Accept: text/html' -o /dev/null -w 'overview=%{http_code}\n' "${PC_ORIGIN}/overview"
```

Both must return HTTP 200 without `-k`. If loopback backend works but the HTTPS
origin fails, fix the reverse proxy, certificate trust, and Windows inbound TCP
443 before touching the Pi. The bundled Windows installer and portable launcher
still default their private backend to `4000`.

Power the **PC before or alongside the Pi**. The thin kiosk waits up to `KIOSK_WAIT_SECONDS` (default **600**) for `/health`; it does not retry forever after that.

### B. Get code and identity onto the Pi

```bash
# From your workstation: transfer only thin-kiosk runtime/install helpers.
rsync -a --relative \
  ./deploy/configure-lightweight-desktop.sh \
  ./deploy/configure-pi5-fan-control.sh \
  ./deploy/disable-display-sleep.sh \
  ./deploy/disable-xfce-display-popups.sh \
  ./deploy/install-thin-kiosk.sh \
  ./deploy/read-solar-display-journal.sh \
  ./deploy/solar-device-agent.py \
  ./deploy/solar-device-agent.service \
  ./deploy/start-solar-kiosk.sh \
  ./deploy/stop-solar-kiosk.sh \
  ./deploy/verify-thin-kiosk.sh \
  "${SSH_TARGET}:~/solar-player-thin/"
ssh "${SSH_TARGET}"
cd ~/solar-player-thin
PC_IP="<windows-server-lan-ip>"
PC_ORIGIN="https://<windows-server-tls-host>"
KIOSK_USER="pi"     # use the same value for desktop setup and thin-kiosk install
test "$(id -gn "${KIOSK_USER}")" = "${KIOSK_USER}"
```

Assumptions: SSH user can `sudo`, kiosk user exists with a normal home directory
and a same-named primary group (required by the existing desktop helper), and the
session is interactive enough for install logs. `PC_IP` and `KIOSK_USER` are
redeclared after SSH because workstation shell variables are not forwarded.

### C. Desktop stack and readonly root

1. On a **fresh Pi**, install the desktop stack once (existing helper, do not modify it):

   ```bash
   sudo ./deploy/configure-lightweight-desktop.sh \
     --user "${KIOSK_USER}" \
     --rdp-auth system-password
   ```

   Confirm that `KIOSK_USER` has a usable system password before choosing
   `system-password`; xrdp login is part of the supported pairing path.

2. Thin-kiosk mode requires a writable root. For a migrated co-located Pi that
   already uses the Solar Player readonly overlay, disable it from the retained
   runtime and reboot **before** install:

   ```bash
   sudo /data/solar-display/deploy/readonly-system-disable.sh
   sudo reboot
   # wait for SSH (see reboot wait helper below), then continue
   ```

   On any other readonly image, use that image's owning disable procedure. The
   thin-kiosk installer fails closed on an overlay and does not install the
   co-located readonly launchers because their `/data/solar-display` runtime is
   intentionally absent.

### D. Discover Pi LAN IP (for device-agent and PC `DEVICE_AGENT_URL`)

```bash
hostname -I | awk '{print $1}'
# or: ip -4 route get 1.1.1.1 | awk '{print $7; exit}'
PI_IP="<result>"
```

## Install (new thin kiosk)

```bash
cd ~/solar-player-thin

sudo ./deploy/install-thin-kiosk.sh \
  --kiosk-url "${PC_ORIGIN}/overview" \
  --kiosk-user "${KIOSK_USER}" \
  --server-allow-ip "${PC_IP}"
```

Exit the Pi shell after install. The pairing steps below return to workstation
Bash and redefine any values they use.

What this does:

- Installs Firefox kiosk autostart via a thin wrapper that sets `KIOSK_URL`, `KIOSK_HEALTH_URL`, and extended `KIOSK_WAIT_SECONDS` (default **600**).
- Renders a thin-kiosk-specific copy of `deploy/start-solar-kiosk.sh` that selects the dedicated Firefox Profile and never uses private-window.
- Installs `solar-device-agent.service` + least-privilege journal helper (copy of existing `read-solar-display-journal.sh`, not modified).
- Configures fan control, no-sleep, and lightdm autologin; removes stale
  co-located readonly launchers from older thin-kiosk installs.
- **Does not** install `solar-display.service`, node, or pnpm.

## First pairing

Keep the two execution contexts separate:

- **Windows PC PowerShell**: list Devices and issue the one-time token through loopback.
- **Workstation Bash**: operate the Pi over SSH. Reuse the operation-time
  `SSH_TARGET`, `PC_ORIGIN`, `KIOSK_USER`, and `KIOSK_HOME` values from this
  runbook.

### A. Prove the RDP clipboard path before issuing a token

From workstation Bash, fail unless xrdp is enabled and active:

```bash
ssh "${SSH_TARGET}" \
  "systemctl is-enabled --quiet xrdp && systemctl is-active --quiet xrdp"
```

If this fails on a fresh Pi, rerun `sudo ./deploy/configure-lightweight-desktop.sh` and resolve xrdp before continuing.

On the Windows PC, prove TCP 3389 first, open RDP, and ensure **Local Resources → Clipboard** is enabled:

```powershell
$PiHost = "<pi-host-or-magicdns>"
$RdpCheck = Test-NetConnection -ComputerName $PiHost -Port 3389
if (-not $RdpCheck.TcpTestSucceeded) {
  throw "Pi xrdp port 3389 is not reachable"
}

Set-Clipboard -Value "solar-pairing-clipboard-check"
mstsc.exe /v:$PiHost
```

Log in as the same `KIOSK_USER` passed to the installer. In the RDP session, paste into a text editor and confirm the exact sentinel `solar-pairing-clipboard-check`; then clear it with `Set-Clipboard -Value ""` on Windows. Do not issue a 15-minute token until this check passes.

### B. Issue the token on the Windows PC

Run in PowerShell on the PC server. The list call provides the `DeviceId`; do not guess it from hostname or IP.

```powershell
function New-SolarManagementHeaders {
  $Result = @{}
  if ($env:MANAGEMENT_ACCESS_TOKEN) {
    $Result["x-solar-management-token"] = $env:MANAGEMENT_ACCESS_TOKEN
  } else {
    $UseToken = Read-Host "Is MANAGEMENT_ACCESS_TOKEN configured? [y/N]"
    if ($UseToken -eq "y") {
      $SecureToken = Read-Host "Management token" -AsSecureString
      $Result["x-solar-management-token"] =
        [System.Net.NetworkCredential]::new("", $SecureToken).Password
    }
  }
  return $Result
}

$PcPort = 4000
$Headers = New-SolarManagementHeaders
$Devices = Invoke-RestMethod -Method Get -Headers $Headers `
  -Uri "http://127.0.0.1:$PcPort/api/devices"
$Devices.data | Select-Object id, clientId, displayName, enabled, groupId,
  @{Name="groupEnabled"; Expression={$_.group.enabled}},
  @{Name="siteScope"; Expression={$_.group.siteScope}},
  @{Name="playbackProfile"; Expression={$_.group.playbackProfile.profileKey}}
$DeviceId = [int](Read-Host "Device id to pair")
$Device = $Devices.data | Where-Object id -eq $DeviceId
if (-not $Device -or -not $Device.enabled -or -not $Device.group -or
    -not $Device.group.enabled -or -not $Device.group.siteScope -or
    -not $Device.group.playbackProfile.id) {
  throw "Device must be enabled and assigned to an enabled Group with Site Scope and Playback Profile"
}
$Pairing = Invoke-RestMethod -Method Post -Headers $Headers `
  -Uri "http://127.0.0.1:$PcPort/api/devices/$DeviceId/pairing-tokens"
Set-Clipboard -Value $Pairing.data.token
Write-Host "Pairing Token copied to clipboard; expires at $($Pairing.data.expiresAt)"
```

The response also contains `pairingPath` in the form `/device-pairing#token=<token>` for a future management surface. The fragment is not sent in the landing-page HTTP request, Server log, or Referer. For this runbook, do **not** place the token or pairingPath in shell history, SSH arguments, Firefox arguments, or logs; paste it into the landing page instead.

Keep the proven RDP window open for step C. The token remains inside the Windows desktop/RDP clipboard boundary and never passes through the workstation shell. A physical keyboard may be used only by typing the token manually; the supported copy/paste path is the Windows-PC-to-Pi RDP session.

### C. Open the token-free landing page in the RDP display

The xrdp session is not `DISPLAY=:0`. First stop the autologin kiosk Firefox from
workstation Bash and wait for its Profile lock to clear:

```bash
FIREFOX_PROFILE="${KIOSK_HOME}/.mozilla/firefox/solar-display-kiosk"
PAIRING_PAGE="${PC_ORIGIN}/device-pairing"
PAIRING_STATUS_URL="${PC_ORIGIN}/api/device-pairing/status"

ssh "${SSH_TARGET}" \
  "sudo -u '${KIOSK_USER}' pkill firefox 2>/dev/null || true
   for i in \$(seq 1 30); do
     if ! pgrep -u '${KIOSK_USER}' firefox >/dev/null; then exit 0; fi
     sleep 1
   done
   echo 'Firefox profile lock did not clear' >&2
   exit 1"
```

In a terminal **inside the Pi RDP session**, run the token-free command below.
It inherits the RDP display and uses the same dedicated Profile:

```bash
FIREFOX_PROFILE="${HOME}/.mozilla/firefox/solar-display-kiosk"
PAIRING_PAGE="https://<windows-server-tls-host>/device-pairing"
firefox -kiosk --profile "${FIREFOX_PROFILE}" "${PAIRING_PAGE}"
```

Paste the Windows/RDP clipboard token into that Firefox window and select **配對**.
Observable result: the page briefly shows pairing state, then redirects to
`/overview`. Close the RDP Firefox after recording success so the Profile can
return to the autologin display.

Immediately clear the clipboard and sensitive PowerShell variables on the PC:

```powershell
Set-Clipboard -Value ""
$Pairing = $null
$SecureToken = $null
$Headers.Clear()
```

### D. Prove the new credential is active

Back in workstation Bash, define the bounded launcher for `DISPLAY=:0`, then open
the status endpoint with the same Profile:

```bash
launch_kiosk_url() {
  local target_url="$1"
  local target_q
  printf -v target_q '%q' "${target_url}"

  ssh "${SSH_TARGET}" \
    "sudo -u '${KIOSK_USER}' pkill firefox 2>/dev/null || true
     for i in \$(seq 1 30); do
       if ! pgrep -u '${KIOSK_USER}' firefox >/dev/null; then break; fi
       if [[ \"\${i}\" -eq 30 ]]; then echo 'Firefox profile lock did not clear' >&2; exit 1; fi
       sleep 1
     done
     sudo -u '${KIOSK_USER}' env DISPLAY=:0 XAUTHORITY='${KIOSK_HOME}/.Xauthority' \
       nohup firefox -kiosk --profile '${FIREFOX_PROFILE}' ${target_q} \
       >'${KIOSK_HOME}/.local/state/solar-display/pairing-launcher.log' 2>&1 \
       </dev/null &"
}

launch_kiosk_url "${PAIRING_STATUS_URL}"
```

Expected on the kiosk display: HTTP 200 JSON with `success: true`, `data.paired: true`, and the selected `deviceId`/`clientId`. It does not include Group, Site, Profile, or credential data.

Return to playback after recording the result:

```bash
launch_kiosk_url "${KIOSK_URL}"
```

The one-time token must not be reused. If the same token is submitted again, the landing page shows `pairing_token_used`.

If pairing fails, clear the clipboard and close the RDP Firefox before retrying:

- `pairing_token_expired`, `pairing_token_used`, or `pairing_token_invalid`:
  issue a new token, reopen the token-free landing page in the RDP display, and
  paste only the new token.
- `device_disabled` or `group_disabled`: correct Device/Group eligibility through
  the management API or surface, repeat the eligibility read-back, then issue a
  new token.
- A management request denied before token issuance: correct
  `MANAGEMENT_ACCESS_TOKEN`; do not continue with pairing.
- `credential_missing`, `credential_invalid`, `credential_expired`, or
  `credential_revoked` from the status endpoint: treat the Profile as unpaired,
  issue a fresh token after the eligibility read-back, and repeat the RDP-display
  pairing flow. `group_disabled` also covers an unusable Group Site Scope or
  Playback Profile.

### Existing `solar-display.service` detected

The installer **will not** silently remove a co-located server. It exits and asks you to either:

- **Migrate** (recommended for split topology): stop+disable, keep files — see [Migrate](#migrate-existing-co-located-pi). Use `--migrate --confirm-migrate`.
- **Proceed with unit left in place**: `--confirm-existing-service`. This only acknowledges the unit; it does **not** stop it. Risk: local server still binds `:3000` on the Pi and competes with the thin-kiosk story. Prefer migrate unless you are debugging.

Do not delete the unit file yourself; rollback needs it.

## Verify (thin-kiosk only)

Do **not** use `deploy/verify-kiosk-install.sh` — it requires an active `solar-display.service` and `/data` runtime.

```bash
sudo ./deploy/verify-thin-kiosk.sh \
  --kiosk-user "${KIOSK_USER}" \
  --kiosk-url "${PC_ORIGIN}/overview"
```

The verifier must report that the dedicated Firefox Profile is selected and that the launcher does not use private-window.

## Reboot witness

Capture boot time, reboot, **wait for SSH with retries**, then prove kiosk URL and services:

```bash
verify_reboot_witness() {
  local before after
  local reboot_ok=0
  local firefox_ok=0

  before="$(ssh "${SSH_TARGET}" 'uptime -s')" || return 1
  echo "boot_before=${before}"
  ssh "${SSH_TARGET}" 'sudo reboot' || true

  # Wait for SSH to return with a different boot timestamp (up to ~3 minutes).
  for i in $(seq 1 60); do
    if ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=accept-new \
      "${SSH_TARGET}" 'true' 2>/dev/null; then
      after="$(ssh "${SSH_TARGET}" 'uptime -s')" || return 1
      echo "boot_after=${after}"
      if [[ "${after}" != "${before}" ]]; then
        reboot_ok=1
        break
      fi
    fi
    sleep 3
  done
  [[ "${reboot_ok}" -eq 1 ]] || return 1

  ssh "${SSH_TARGET}" \
    "systemctl is-active --quiet solar-device-agent lightdm &&
     systemctl is-enabled --quiet solar-device-agent" || return 1
  ssh "${SSH_TARGET}" \
    "sudo ~/solar-player-thin/deploy/verify-thin-kiosk.sh \
       --kiosk-user '${KIOSK_USER}' \
       --kiosk-url '${PC_ORIGIN}/overview'" || return 1

  for i in $(seq 1 30); do
    if ssh "${SSH_TARGET}" "pgrep -u '${KIOSK_USER}' firefox >/dev/null"; then
      firefox_ok=1
      break
    fi
    sleep 3
  done
  [[ "${firefox_ok}" -eq 1 ]] || return 1
}

verify_reboot_witness || {
  echo "FAIL: reboot witness did not satisfy every gate" >&2
  exit 1
}

# Reuse the workstation Bash helper only after every reboot gate passes.
launch_kiosk_url "${PAIRING_STATUS_URL}" || exit 1
```

The shell gate proves the reboot, exact configured kiosk URL, services, Profile,
and Firefox relaunch. The final credential gate is an operator read-back in the
Firefox window: require HTTP 200, `data.paired: true`, and the same
`deviceId`/`clientId` recorded during First pairing. Stop here and treat any
401/403, different identity, or non-JSON page as a failed reboot witness; follow
the credential recovery mapping above before continuing.

Expect:

- `boot_after` differs from `boot_before` (actual reboot).
- Wrapper `KIOSK_URL` equals `<PC_ORIGIN>/overview`.
- `solar-device-agent` and `lightdm` active; Firefox process present after autologin (allow ~30–90s after SSH returns for desktop + health wait).
- Launcher log shows health wait then Firefox start; on the physical kiosk display you should see the PC overview page.
- The status endpoint still returns `data.paired: true` with the same Device after reboot; this proves the Cookie survived and is currently valid.
- From PC: `curl http://<Pi_IP>:3001/stats` returns JSON when allowlisted.

Return the kiosk to playback:

```bash
launch_kiosk_url "${KIOSK_URL}"
```

## Revoke and re-pair recovery

If the Pi is replaced, the Profile is lost, or the credential may have leaked,
first prove the recovery channel and prepare a replacement token:

```powershell
function New-SolarManagementHeaders {
  $Result = @{}
  if ($env:MANAGEMENT_ACCESS_TOKEN) {
    $Result["x-solar-management-token"] = $env:MANAGEMENT_ACCESS_TOKEN
  } else {
    $UseToken = Read-Host "Is MANAGEMENT_ACCESS_TOKEN configured? [y/N]"
    if ($UseToken -eq "y") {
      $SecureToken = Read-Host "Management token" -AsSecureString
      $Result["x-solar-management-token"] =
        [System.Net.NetworkCredential]::new("", $SecureToken).Password
    }
  }
  return $Result
}

$PiHost = "<pi-host-or-magicdns>"
$PcPort = 4000
$RdpCheck = Test-NetConnection -ComputerName $PiHost -Port 3389
if (-not $RdpCheck.TcpTestSucceeded) {
  throw "Pi xrdp port 3389 is not reachable"
}
Set-Clipboard -Value "solar-repair-clipboard-check"
mstsc.exe /v:$PiHost
```

Log in to the Pi RDP session, paste
`solar-repair-clipboard-check` into a text editor, and leave that session open.
Do not revoke anything until this succeeds. Then continue in PC PowerShell.
Issue and copy the replacement token **before** revocation, so a
token/clipboard failure leaves the current credential active:

```powershell
$Headers = New-SolarManagementHeaders
$Devices = Invoke-RestMethod -Method Get -Headers $Headers `
  -Uri "http://127.0.0.1:$PcPort/api/devices"
$Devices.data | Select-Object id, clientId, displayName, enabled, groupId,
  @{Name="groupEnabled"; Expression={$_.group.enabled}},
  @{Name="siteScope"; Expression={$_.group.siteScope}},
  @{Name="playbackProfile"; Expression={$_.group.playbackProfile.profileKey}}
$DeviceId = [int](Read-Host "Device id to revoke and re-pair")
$Device = $Devices.data | Where-Object id -eq $DeviceId
if (-not $Device -or -not $Device.enabled -or -not $Device.group -or
    -not $Device.group.enabled -or -not $Device.group.siteScope -or
    -not $Device.group.playbackProfile.id) {
  throw "Device must be enabled and assigned to an enabled Group with Site Scope and Playback Profile"
}

$Pairing = Invoke-RestMethod -Method Post -Headers $Headers `
  -Uri "http://127.0.0.1:$PcPort/api/devices/$DeviceId/pairing-tokens"
Set-Clipboard -Value $Pairing.data.token
Write-Host "Replacement Pairing Token copied; expires at $($Pairing.data.expiresAt)"

$Revoke = Invoke-RestMethod -Method Post -Headers $Headers `
  -Uri "http://127.0.0.1:$PcPort/api/devices/$DeviceId/credentials/revoke"
if ($Revoke.data.revokedCount -notin @(0, 1)) {
  throw "Unexpected revoked credential count"
}
```

Expected: HTTP 200 and `data.revokedCount` of `1` when one active credential
existed. A retry may return `0`; continue with the already-issued fresh token.
The old kiosk can no longer authenticate.

The recovery path below is standalone. In workstation Bash, recreate every required value and the bounded launcher:

```bash
PI_HOST="<pi-host-or-magicdns>"
PI_USER="<pi-ssh-user>"
SSH_TARGET="${PI_USER}@${PI_HOST}"
PC_IP="<windows-server-lan-ip>"
PC_ORIGIN="https://<windows-server-tls-host>"
KIOSK_USER="<same-kiosk-user-used-at-install>"
KIOSK_HOME="$(ssh "${SSH_TARGET}" "getent passwd '${KIOSK_USER}' | cut -d: -f6")"
test -n "${KIOSK_HOME}"
FIREFOX_PROFILE="${KIOSK_HOME}/.mozilla/firefox/solar-display-kiosk"
PAIRING_PAGE="${PC_ORIGIN}/device-pairing"
PAIRING_STATUS_URL="${PC_ORIGIN}/api/device-pairing/status"
KIOSK_URL="${PC_ORIGIN}/overview"

launch_kiosk_url() {
  local target_url="$1"
  local target_q
  printf -v target_q '%q' "${target_url}"

  ssh "${SSH_TARGET}" \
    "sudo -u '${KIOSK_USER}' pkill firefox 2>/dev/null || true
     for i in \$(seq 1 30); do
       if ! pgrep -u '${KIOSK_USER}' firefox >/dev/null; then break; fi
       if [[ \"\${i}\" -eq 30 ]]; then echo 'Firefox profile lock did not clear' >&2; exit 1; fi
       sleep 1
     done
     sudo -u '${KIOSK_USER}' env DISPLAY=:0 XAUTHORITY='${KIOSK_HOME}/.Xauthority' \
       nohup firefox -kiosk --profile '${FIREFOX_PROFILE}' ${target_q} \
       >'${KIOSK_HOME}/.local/state/solar-display/pairing-launcher.log' 2>&1 \
       </dev/null &"
}

launch_kiosk_url "${PAIRING_STATUS_URL}" || exit 1
```

Expected on the kiosk display: HTTP 401 with code `credential_revoked`.

After recording the 401, stop `DISPLAY=:0` Firefox and wait for the Profile lock
to clear:

```bash
ssh "${SSH_TARGET}" \
  "sudo -u '${KIOSK_USER}' pkill firefox 2>/dev/null || true
   for i in \$(seq 1 30); do
     if ! pgrep -u '${KIOSK_USER}' firefox >/dev/null; then exit 0; fi
     sleep 1
   done
   echo 'Firefox profile lock did not clear' >&2
   exit 1"
```

Then, in a terminal inside the already-proven Pi RDP session, open the token-free
page on the RDP display:

```bash
FIREFOX_PROFILE="${HOME}/.mozilla/firefox/solar-display-kiosk"
PAIRING_PAGE="https://<windows-server-tls-host>/device-pairing"
firefox -kiosk --profile "${FIREFOX_PROFILE}" "${PAIRING_PAGE}"
```

Paste the replacement token and select **配對**. Successful re-pairing overwrites
the Cookie in the same dedicated Profile. Close the RDP Firefox before returning
to the workstation helper.

Finally, run `launch_kiosk_url "${PAIRING_STATUS_URL}"` again. Expected: HTTP 200 with `data.paired: true`; then return to `launch_kiosk_url "${KIOSK_URL}"`. Never print or copy a Device Credential value, and never edit `cookies.sqlite` manually.

Clear the replacement token and management material in PC PowerShell:

```powershell
Set-Clipboard -Value ""
$Pairing = $null
$SecureToken = $null
$Headers.Clear()
```

If the replacement token expires or is consumed before success, clear it, issue
a new token, and repeat the RDP-display step. If the Device or Group becomes
disabled, correct eligibility and repeat the authenticated Device read-back
before issuing another token. A repeated revoke returning `revokedCount: 0` is a
safe recovery state, not an error.

## Device-agent + PC `DEVICE_AGENT_URL`

On the **PC** `.env`:

```env
DEVICE_AGENT_URL=http://<Pi_IP>:3001
```

Restart the PC nssm service. Management Device Status **host-stats** then show the Pi. **App logs stay on the PC** (Windows → unavailable in this phase).

From the PC:

```bash
curl -fsS "http://<Pi_IP>:3001/stats"
curl -fsS "http://<Pi_IP>:3001/logs?limit=20"
# From a non-allowlisted host, expect HTTP 403 with empty body.
```

## Migrate existing co-located Pi

One Pi at a time (canary first). Requires explicit confirmation:

```bash
sudo ./deploy/install-thin-kiosk.sh \
  --kiosk-url "${PC_ORIGIN}/overview" \
  --kiosk-user "${KIOSK_USER}" \
  --server-allow-ip "${PC_IP}" \
  --migrate \
  --confirm-migrate
```

Effects:

- `systemctl stop` + `disable` `solar-display.service` (**does not delete** the unit or `/data/solar-display`).
- Installs thin-kiosk pointing at the PC.
- Old install remains on disk for rollback.

## Full rollback to co-located mode

Re-enabling the service alone is **not enough** — kiosk autostart still points at the PC.

1. Re-enable and start the old service:

   ```bash
   sudo systemctl enable --now solar-display
   ```

2. Re-point the kiosk to local server with the **unmodified** installer:

   ```bash
   KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
   KIOSK_GROUP="$(id -gn "${KIOSK_USER}")"
   sudo env \
     INSTALL_DIR=/data/solar-display \
     KIOSK_USER="${KIOSK_USER}" \
     KIOSK_GROUP="${KIOSK_GROUP}" \
     KIOSK_HOME="${KIOSK_HOME}" \
     /data/solar-display/deploy/install-kiosk.sh
   # (uses local 127.0.0.1:3000 defaults via start-solar-kiosk.sh)
   ```

3. Confirm runtime:

   ```bash
   sudo env \
     KIOSK_USER="${KIOSK_USER}" \
     KIOSK_HOME="${KIOSK_HOME}" \
     /data/solar-display/deploy/verify-kiosk-install.sh
   ls /data/solar-display/data
   ```

Do not re-enable the co-located readonly overlay while remaining in thin-kiosk
mode; its helper validates a local `/data/solar-display` application runtime.

## Completion gate

- `verify-thin-kiosk.sh` passes (URL, desktop stack, autologin/no-sleep/fan, device-agent).
- First pairing redirects to `/overview`, and the status endpoint returns `data.paired: true` through the dedicated Profile without printing the credential.
- Reboot witness: Firefox opens PC overview URL; `uptime -s` changed.
- From PC: device-agent `/stats` JSON; non-PC source 403.
- PC Device Status host-stats reflect Pi when `DEVICE_AGENT_URL` is set.

## Related

- PC server: `docs/runbooks/pc-server-deploy.md`
- Skill: `.agents/skills/split-deployment/SKILL.md`
- Legacy co-located: `.agents/skills/pi5-deployment/SKILL.md` (unchanged rollback path)
