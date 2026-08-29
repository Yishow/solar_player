# Windows PC Server Deploy (Split Topology)

Run the Solar Player **server** as a persistent Windows service on a PC so one or more Raspberry Pi thin kiosks can open `http://<PC_IP>:3000/overview` over the LAN.

This runbook is **additive**. It does not replace the co-located Pi deployment (`pi5-deployment` skill / `install-kiosk.sh`).

## Supported Target

- Windows 10/11 or Windows Server with administrator rights.
- Node.js LTS (same major as the monorepo expects) and `pnpm` on PATH.
- Network: PC has a stable LAN IP (or reserved DHCP lease) reachable from each Pi.
- External MQTT broker remains the project broker (operation-time host; not installed by this runbook).

## Operation-Time Values

Set these for the current operation; do not commit secrets or site IPs into the repo:

```text
PC_IP=<windows-lan-ip>
REPO_ROOT=<absolute path to solar_player clone>
MQTT_BROKER=<broker-host>
MQTT_PORT=1883
```

## 1. Prerequisites

1. Clone the repository to `REPO_ROOT` (or copy a release bundle).
2. Install Node.js LTS and enable `corepack` / install `pnpm`.
3. Install **nssm** (Non-Sucking Service Manager) and ensure `nssm` is on PATH, or call it by full path.
4. **better-sqlite3** is a native module:
   - Prefer a release that ships a prebuilt binary for your Node version and Windows arch.
   - If install fails to compile, install **Visual Studio Build Tools** with the “Desktop development with C++” workload, then re-run `pnpm install`.
   - The Linux helper `pnpm dev:fix` **does not apply on Windows**.

## 2. Build

From `REPO_ROOT` in PowerShell or cmd:

```powershell
cd $env:REPO_ROOT
pnpm install
pnpm build
```

Confirm artifacts:

- `apps/server/dist/server.js`
- `apps/web/dist` (served by the server as static assets)

## 3. PC-specific `.env`

Create `REPO_ROOT\.env` (do not commit real secrets). Minimum:

```env
HOST=0.0.0.0
PORT=3000
NODE_ENV=production
DATA_DIR=./data
DATABASE_PATH=./data/solar-display.sqlite
MQTT_BROKER=<broker-host>
MQTT_PORT=1883
MQTT_DATA_MODE=mqtt
LOG_DIR=./logs
LOG_LEVEL=info

# When a Pi device-agent is running, point host-stats at that Pi:
# DEVICE_AGENT_URL=http://<Pi_IP>:3001
DEVICE_AGENT_URL=
```

Notes:

- `HOST=0.0.0.0` is required so LAN clients can connect (not only loopback).
- `DEVICE_AGENT_URL` is optional. When set, Device Status **host-stats** (disk/mem/cpu/uptime) come from the Pi agent. **Logs always stay on this PC** and ignore the agent. On Windows there is no journald, so Device Status app logs return **unavailable** in this phase (expected).

## 3A. MQTT collector control authorization

The active Go collector uses the separated control contract:

```text
solar/{SITE}/cmd/get-config       QoS 1, non-retained command
solar/{SITE}/cmd/set              QoS 1, non-retained command
solar/{SITE}/state/config         QoS 1, retained sanitized state
solar/{SITE}/state/control-result QoS 1, non-retained result
```

The reviewable ACL template is [deploy/mosquitto/solar-collector-control.acl.example](../../deploy/mosquitto/solar-collector-control.acl.example). It contains usernames and site examples only; provision the password file, certificates, and any final site additions outside the repository.

For a central PC that also runs the collector, prefer loopback and authenticated local Mosquitto transport:

```text
listener 1883 127.0.0.1
allow_anonymous false
password_file C:\ProgramData\mosquitto\solar-control.passwd
acl_file C:\ProgramData\mosquitto\solar-collector-control.acl
```

The Go collector's `mqtt_host` must remain `localhost` for this topology. Protect the password/ACL files with an administrator and the Mosquitto service account only:

```powershell
$MqttData = "C:\ProgramData\mosquitto"
mosquitto_passwd -c "$MqttData\solar-control.passwd" solar-control
mosquitto_passwd "$MqttData\solar-control.passwd" solar-collector
icacls "$MqttData\solar-control.passwd" /inheritance:r /grant:r "SYSTEM:(R)" "Administrators:(F)"
icacls "$MqttData\solar-collector-control.acl" /inheritance:r /grant:r "SYSTEM:(R)" "Administrators:(F)"
```

The Go collector has no service-manager or install-service integration. Its
broker identity is read only from the process environment, so launch the
Windows tray or console binary from a protected session (or an approved
protected wrapper) that supplies these values without printing them. The
following uses a Windows DPAPI-protected credential file; provision it once
under the same Windows account that will launch the collector:

```powershell
$CollectorDir = "C:\Program Files\SolarPlayer"
$CredentialFile = "C:\ProgramData\SolarPlayer\solar-collector.credential.xml"
New-Item -ItemType Directory -Force (Split-Path $CredentialFile) | Out-Null
$credential = Get-Credential -UserName "solar-collector" -Message "MQTT credential"
$credential | Export-Clixml -Path $CredentialFile
icacls $CredentialFile /inheritance:r /grant:r "${env:USERNAME}:(R)" "Administrators:(F)"
```

Keep `solar_config.json` beside the executable; its path is resolved from the
binary directory rather than the current directory. Protect that file because
the existing scraper config may contain site login fields, but do not place
the broker password in it. A foreground console launch (useful for diagnosis)
and a windowless tray launch are:

```powershell
$credential = Import-Clixml -Path $CredentialFile
$env:SOLAR_MQTT_USERNAME = $credential.UserName
$env:SOLAR_MQTT_PASSWORD = $credential.GetNetworkCredential().Password
# For a remote broker only, set these from protected operation-time values:
# $env:SOLAR_MQTT_TLS_CA_FILE = "C:\ProgramData\SolarPlayer\broker-ca.pem"
# $env:SOLAR_MQTT_TLS_SERVER_NAME = "<broker-certificate-name>"

& "$CollectorDir\solar_mqtt_go_windows_amd64_console.exe" run
# Or, in a separate protected session, launch the tray binary with no args:
# & "$CollectorDir\solar_mqtt_go_windows_amd64_tray.exe"

Remove-Item Env:SOLAR_MQTT_USERNAME, Env:SOLAR_MQTT_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:SOLAR_MQTT_TLS_CA_FILE, Env:SOLAR_MQTT_TLS_SERVER_NAME -ErrorAction SilentlyContinue
```

The environment exists only for the launched process/session and is not a
durable service definition. The collector rejects missing credentials, remote
plaintext MQTT, and disabled TLS certificate verification before it opens a
broker connection. Unattended persistence/autostart is outside this Go
release contract; do not reintroduce NSSM or an `install-service` command in
the collector. The separate `solar-control` identity is for the management
publisher.

Do not put a password in a command, `.env`, Git, or the runbook. Use the site's approved secret wrapper for `mosquitto_pub`/`mosquitto_sub` verification. If a control-capable client is moved off the PC, do not use the LAN `1883` listener: configure a separate TLS listener with a CA, server certificate, and private key protected outside Git, and require client-side server certificate verification before provisioning reusable credentials. The current local collector path is the supported control transport; remote control requires a TLS-capable client configuration to be witnessed before use.

### ACL verification before cutover

1. Validate the broker configuration, reload Mosquitto, and confirm the collector reconnects. The management identity must be able to publish a valid command to `solar/CL/cmd/set` or `solar/KN/cmd/set`; its payload must include `requestId`, `issuedAt`, `ttlSeconds`, and an allowlisted `changes` object.
2. Using a fresh observer subscription, confirm `solar/<SITE>/state/config` is retained and sanitized, while `solar/<SITE>/state/control-result` is non-retained.
3. Attempt the same command with the ordinary producer/observer identity. `mosquitto_pub` must fail with an authorization error, and no control result or configuration change may appear.
4. Confirm the collector identity can subscribe only to the explicit configured-site `cmd/#` topics and publish its configured-site data/state topics. It must not have a wildcard control subscription or any write permission to `cmd/#`.

Keep the authorized and denied command outputs, broker ACL reload result, and fresh observer result as the production witness. Repository tests validate the template and contract shape only; they cannot prove the live broker identities.

### Credential rotation

1. Create the replacement management or collector identity/password in the protected password file and add its ACL entries without removing the current working identity.
2. Reload Mosquitto and verify one authorized command, one collector reconnect, and one denied ordinary publish using the replacement identity.
3. Update the protected collector launch configuration, restart/reconnect the collector process, and confirm the old identity is no longer used.
4. Remove the old password/ACL entry, reload again, and repeat the denied-publish check. Never open `cmd/#` to recover from a failed rotation; use the console-local recovery identity and the previous ACL backup.

### Legacy retained-state scrub

After the new command/state path and ACL are verified, clear only the configured legacy topics. Use a separately provisioned, temporary `solar-migration-scrub` identity with exact legacy-topic write access for this step; do not add that identity to the hardened post-cutover ACL. Publish an empty retained tombstone to each exact topic (for example `solar/CL/config` and `solar/KN/config`); do not use a wildcard purge:

```powershell
# Run through the approved secret wrapper; do not paste a password here.
mosquitto_pub -h 127.0.0.1 -p 1883 -u solar-migration-scrub -t solar/CL/config -n -r
mosquitto_pub -h 127.0.0.1 -p 1883 -u solar-migration-scrub -t solar/KN/config -n -r
```

Stage only `topic write solar/CL/config` and `topic write solar/KN/config` for that identity, reload Mosquitto, perform the scrub and fresh-subscription checks, then remove the identity/rules and reload again. The hardened ACL template intentionally contains no legacy write grant.

For every tombstoned site, use a new clean subscriber and a short timeout. No retained message must arrive on `solar/<SITE>/config`. Then independently confirm retained `solar/<SITE>/summary` and `solar/<SITE>/state/config` still arrive. Preserve those fresh-subscription outputs as cutover evidence.

If the application must be rolled back, keep the hardened ACL and cleared legacy retained state. Roll back only to the previous Go build that supports the same ACL; do not restore the old Python collector, legacy privileged publish grants, or secret-bearing retained `/config` payloads.

## 4. Windows Firewall (inbound TCP 3000)

Windows Defender Firewall blocks inbound traffic by default. Add an allow rule:

```powershell
New-NetFirewallRule -DisplayName "Solar Player Server 3000" `
  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Diagnosis:

- PC local `curl http://127.0.0.1:3000/health` works, but Pi cannot connect → almost always missing inbound rule or wrong `PC_IP`/network.

## 5. Install as a Windows service with nssm

Working directory **must** be the repo root (so relative `DATA_DIR`, `uploads`, and static paths resolve).

```powershell
cd $env:REPO_ROOT
# Resolve node path
$node = (Get-Command node).Source

nssm install SolarPlayerServer $node "apps\server\dist\server.js"
nssm set SolarPlayerServer AppDirectory $env:REPO_ROOT
nssm set SolarPlayerServer AppEnvironmentExtra "NODE_ENV=production"
# Optional: load dotenv via the process; server already reads REPO_ROOT/.env patterns used by the app.
nssm set SolarPlayerServer AppStdout "$env:REPO_ROOT\logs\solar-player-stdout.log"
nssm set SolarPlayerServer AppStderr "$env:REPO_ROOT\logs\solar-player-stderr.log"
nssm set SolarPlayerServer AppRotateFiles 1
nssm set SolarPlayerServer AppExit Default Restart
nssm set SolarPlayerServer AppRestartDelay 5000
nssm start SolarPlayerServer
```

This is the closest practical equivalent of systemd `Restart=on-failure`.

Verify service state:

```powershell
nssm status SolarPlayerServer
# Expect: SERVICE_RUNNING
```

## 6. Verification (Windows-supported stages)

Preferred PC verification (no Git Bash / sqlite3 CLI required):

```powershell
pnpm --filter @solar-display/shared build
pnpm --filter @solar-display/server test
pnpm --filter @solar-display/web test
pnpm --filter @solar-display/web build
pnpm --filter @solar-display/server build
```

Or monorepo build only if tests were already green on a developer machine:

```powershell
pnpm build
```

Live smoke on the PC:

```powershell
curl.exe -fsS http://127.0.0.1:3000/health
curl.exe -fsS -H "Accept: text/html" -o NUL -w "overview=%{http_code}`n" http://127.0.0.1:3000/overview
```

From a Pi (or any LAN host):

```bash
curl -fsS "http://${PC_IP}:3000/health"
curl -fsS -H 'Accept: text/html' -o /dev/null -w 'overview=%{http_code}\n' "http://${PC_IP}:3000/overview"
```

Both must return HTTP 200.

### Full `pnpm verify` on Windows (optional)

The full monorepo `pnpm verify` includes `deploy` / `server-runner` stages that expect:

- Git Bash providing `bash.exe`
- A `sqlite3` CLI on PATH

Those stages are **optional** for PC go-live. Supported PC gate is **build + server + web** as above.

## 7. Logging constraints (this phase)

- nssm redirects stdout/stderr to log files under `logs/` (configure as above).
- Device Status **app-log** API sources the solar-display **journald** unit on Linux only.
- On Windows, Device Status logs return a **bounded unavailable** response with a non-empty reason (not 500). File-based log reading by Device Status is a future enhancement.

## 8. Completion gate

PC server phase is complete when:

1. `SolarPlayerServer` (nssm) is `SERVICE_RUNNING`.
2. `GET http://127.0.0.1:3000/health` → 200.
3. From the Pi LAN: `GET http://<PC_IP>:3000/health` → 200 and `GET /overview` with `Accept: text/html` → 200.
4. Inbound firewall rule for TCP 3000 is present.

## 9. Rollback / stop

```powershell
nssm stop SolarPlayerServer
# Optional remove:
# nssm remove SolarPlayerServer confirm
```

Co-located Pi deployments are unaffected by this PC install.

## Related

- Pi thin kiosk: `docs/runbooks/pi-thin-kiosk-deploy.md`
- Skill orchestration: `.agents/skills/split-deployment/SKILL.md`
- Device agent host-stats: set `DEVICE_AGENT_URL=http://<Pi_IP>:3001` after the Pi agent is up
