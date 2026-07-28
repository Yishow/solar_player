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
