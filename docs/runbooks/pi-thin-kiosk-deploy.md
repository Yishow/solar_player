# Pi Thin-Kiosk Deploy (Split Topology)

Turn a Raspberry Pi 5 into a **browser-only** kiosk that opens a remote Solar Player server on a Windows PC. The Pi does **not** run Node, SQLite, or `solar-display.service`.

## Supported Target

- Raspberry Pi 5, Ubuntu 24.04 arm64.
- Graphical stack: XFCE + lightdm + Firefox (same lightweight desktop as co-located kiosks).
- Default kiosk user: `pi` (override with `--kiosk-user`).

## Operation-Time Values

```bash
PI_HOST="<pi-host-or-magicdns>"
PI_USER="<pi-ssh-user>"
SSH_TARGET="${PI_USER}@${PI_HOST}"
PC_IP="<windows-server-lan-ip>"
KIOSK_URL="http://${PC_IP}:3000/overview"
```

## Prerequisites

### A. PC server minimum self-check (before touching the Pi)

You do not need the full PC runbook text here, but the PC must already be live. From **any** LAN host (including the Pi):

```bash
PC_IP="<windows-server-lan-ip>"
curl -fsS "http://${PC_IP}:3000/health"
curl -fsS -H 'Accept: text/html' -o /dev/null -w 'overview=%{http_code}\n' "http://${PC_IP}:3000/overview"
```

Both must return HTTP 200. If local PC `127.0.0.1` works but LAN fails, fix Windows inbound TCP 3000 first (`docs/runbooks/pc-server-deploy.md` §4).

Power the **PC before or alongside the Pi**. The thin kiosk waits up to `KIOSK_WAIT_SECONDS` (default **600**) for `/health`; it does not retry forever after that.

### B. Get code and identity onto the Pi

```bash
# From your workstation (example): copy the repo, or at least deploy/ + helpers
rsync -a --exclude node_modules --exclude .git ./ "${SSH_TARGET}:~/solar_player/"
ssh "${SSH_TARGET}"
cd ~/solar_player   # or your chosen path; all sudo ./deploy/... commands are relative to repo root
```

Assumptions: SSH user can `sudo`, kiosk user (default `pi`) exists with a normal home directory (`/home/pi`), and the session is interactive enough for install logs.

### C. Desktop stack and readonly root

1. On a **fresh Pi**, install the desktop stack once (existing helper, do not modify it):

   ```bash
   sudo ./deploy/configure-lightweight-desktop.sh
   ```

2. If the Pi uses **readonly root**, disable it and reboot **before** install:

   ```bash
   sudo ./deploy/readonly-system-disable.sh
   sudo reboot
   # wait for SSH (see reboot wait helper below), then continue
   ```

### D. Discover Pi LAN IP (for device-agent and PC `DEVICE_AGENT_URL`)

```bash
ssh "${SSH_TARGET}" "hostname -I | awk '{print \$1}'"
# or: ip -4 route get 1.1.1.1 | awk '{print \$7; exit}'
PI_IP="<result>"
```

## Install (new thin kiosk)

```bash
cd /path/to/solar_player

sudo ./deploy/install-thin-kiosk.sh \
  --kiosk-url "http://${PC_IP}:3000/overview" \
  --kiosk-user pi \
  --server-allow-ip "${PC_IP}"
```

What this does:

- Installs Firefox kiosk autostart via a thin wrapper that sets `KIOSK_URL`, `KIOSK_HEALTH_URL`, and extended `KIOSK_WAIT_SECONDS` (default **600**).
- Reuses unmodified `deploy/start-solar-kiosk.sh`.
- Installs `solar-device-agent.service` + least-privilege journal helper (copy of existing `read-solar-display-journal.sh`, not modified).
- Configures fan control, no-sleep, lightdm autologin, readonly desktop launchers.
- **Does not** install `solar-display.service`, node, or pnpm.

### Existing `solar-display.service` detected

The installer **will not** silently remove a co-located server. It exits and asks you to either:

- **Migrate** (recommended for split topology): stop+disable, keep files — see [Migrate](#migrate-existing-co-located-pi). Use `--migrate --confirm-migrate`.
- **Proceed with unit left in place**: `--confirm-existing-service`. This only acknowledges the unit; it does **not** stop it. Risk: local server still binds `:3000` on the Pi and competes with the thin-kiosk story. Prefer migrate unless you are debugging.

Do not delete the unit file yourself; rollback needs it.

## Verify (thin-kiosk only)

Do **not** use `deploy/verify-kiosk-install.sh` — it requires an active `solar-display.service` and `/data` runtime.

```bash
sudo ./deploy/verify-thin-kiosk.sh \
  --kiosk-user pi \
  --kiosk-url "http://${PC_IP}:3000/overview"
```

## Reboot witness

Capture boot time, reboot, **wait for SSH with retries**, then prove kiosk URL and services:

```bash
BEFORE="$(ssh "${SSH_TARGET}" 'uptime -s')"
echo "boot_before=${BEFORE}"
ssh "${SSH_TARGET}" 'sudo reboot' || true

# Wait for SSH to drop then return (up to ~3 minutes)
for i in $(seq 1 60); do
  if ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=accept-new "${SSH_TARGET}" 'true' 2>/dev/null; then
    AFTER="$(ssh "${SSH_TARGET}" 'uptime -s')"
    echo "boot_after=${AFTER}"
    if [[ "${AFTER}" != "${BEFORE}" ]]; then
      echo "OK: reboot witnessed"
      break
    fi
  fi
  sleep 3
done

ssh "${SSH_TARGET}" 'systemctl is-active solar-device-agent lightdm; systemctl is-enabled solar-device-agent'
ssh "${SSH_TARGET}" 'grep KIOSK_URL /home/pi/bin/start-thin-kiosk.sh'
ssh "${SSH_TARGET}" 'pgrep -a firefox || true; tail -n 40 /home/pi/.local/state/solar-display/kiosk-launcher.log 2>/dev/null || true'
```

Expect:

- `boot_after` differs from `boot_before` (actual reboot).
- Wrapper `KIOSK_URL` equals `http://<PC_IP>:3000/overview`.
- `solar-device-agent` and `lightdm` active; Firefox process present after autologin (allow ~30–90s after SSH returns for desktop + health wait).
- Launcher log shows health wait then Firefox start; on a display/RDP session you should see the PC overview page.
- From PC: `curl http://<Pi_IP>:3001/stats` returns JSON when allowlisted.

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
  --kiosk-url "http://${PC_IP}:3000/overview" \
  --kiosk-user pi \
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
   sudo ./deploy/install-kiosk.sh
   # (uses local 127.0.0.1:3000 defaults via start-solar-kiosk.sh)
   ```

3. Confirm runtime:

   ```bash
   sudo env KIOSK_USER=pi ./deploy/verify-kiosk-install.sh
   ls /data/solar-display/data
   ```

## Readonly after success

```bash
sudo ./deploy/readonly-system-enable.sh
sudo reboot
```

## Completion gate

- `verify-thin-kiosk.sh` passes (URL, desktop stack, autologin/no-sleep/fan, device-agent).
- Reboot witness: Firefox opens PC overview URL; `uptime -s` changed.
- From PC: device-agent `/stats` JSON; non-PC source 403.
- PC Device Status host-stats reflect Pi when `DEVICE_AGENT_URL` is set.

## Related

- PC server: `docs/runbooks/pc-server-deploy.md`
- Skill: `.agents/skills/split-deployment/SKILL.md`
- Legacy co-located: `.agents/skills/pi5-deployment/SKILL.md` (unchanged rollback path)
