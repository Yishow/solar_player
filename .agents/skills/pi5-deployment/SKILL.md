---
name: pi5-deployment
description: Safely deploy, update, reboot, verify, or recover an installed Solar Player Raspberry Pi 5 kiosk. Use for requests such as deploying the latest version to a Pi, applying deployment or boot-profile changes, configuring the preferred maintenance hotspot, checking post-deploy health, proving boot autostart, or handing off rollback material.
---

# Pi 5 Deployment

First classify the request as an application update or a full deployment. Execute the live operation through the repository deployment path and apply only the gates for that scope.

## Read the source of truth

1. Read `AGENTS.md`, `docs/ops/conventions.md`, and `deploy.md` before acting.
2. Treat `deploy/`, `scripts/raspi-onekey-deploy.sh`, and the current worktree as executable truth when documentation differs.
3. Read relevant `openspec/specs/` and active changes when the operation also modifies deployment behavior. Use the repo Spectra workflow for code changes.
4. Keep the target, SSH user, credentials, hotspot name, and other live values operation-time inputs. Do not save IP addresses or secrets in this skill or repository files.

## Select the deployment scope

Use `--scope app` for an installed kiosk when the request is to send the latest code or current changes to a test Pi. This is the normal update path. It preserves `.env`, SQLite data, logs, uploads, and `/data`; creates a verified backup; replaces application files; installs production dependencies; restarts the existing `solar-display.service`; and verifies `release-manifest.json`, service state, `/health`, and the requested page endpoint. App scope must not run apt, Tailscale installation, environment creation, disk mutation, desktop, kiosk, boot, hotspot, readonly-root, full kiosk verification, or reboot actions.

Use `--scope full` for a fresh card, redeployment, host repair, or any change to disk layout, OS packages, desktop/RDP, kiosk/autostart, boot files, kernel, Pi 5 fan control, NetworkManager/hotspot policy, or readonly root. Full scope retains the complete host flow and requires a reboot witness whenever a boot-time or host-level contract changed.

Do not silently escalate app scope to full scope. If an app update lacks an existing installation, `/data`, Node/pnpm, or `solar-display.service`, stop and report that full deployment is required.

## Define the completion gates

Before deployment, state the assumptions and require all applicable gates:

- intentional deployment source and known base commit;
- local `pnpm verify` success;
- target SSH/sudo reachability, supported host, `/data` runtime boundary, and current service/health evidence;
- verified backup before application replacement;
- release identity, service, `/health`, and relevant endpoint evidence after replacement;
- reboot witness for boot configuration, autostart, thermal, readonly-root, kernel, or Wi-Fi-policy changes;
- NetworkManager preferred-profile and delayed-trigger evidence when hotspot management is requested;
- rollback path with no automatic production DB rollback.

Keep unrelated MQTT, weather, playback-readiness, or external-broker blockers separate from deployment success.

## Prepare operation-time values

Set these in the executing shell or command context without writing credentials to disk:

```bash
PI_HOST="<pi-host-or-magicdns>"
PI_USER="<pi-ssh-user>"
SSH_TARGET="${PI_USER}@${PI_HOST}"
HOTSPOT_CONNECTION_ID="<remembered-connection-name>"
HOTSPOT_SCAN_SSID="<case-sensitive-ssid>"
HOTSPOT_PRIORITY="100"
```

For app scope, probe only the installed application prerequisites. For full scope, also probe NetworkManager and all affected host layers:

```bash
git status --short --branch
git log -1 --oneline --decorate
pnpm verify
ssh "${SSH_TARGET}" 'hostname; systemctl is-active solar-display; curl -fsS http://127.0.0.1:3000/health; cat /data/solar-display/release-manifest.json 2>/dev/null || true'
ssh "${SSH_TARGET}" 'command -v node; command -v pnpm; command -v sqlite3; findmnt /data; systemctl cat solar-display.service >/dev/null'
```

If app-scope prerequisites are missing, do not install packages in app scope; stop and route the operation to `--scope full`. Do not bypass the verified backup gate.

## Run a normal application update

Use update mode for an already-installed kiosk. Preserve `.env`, SQLite data, logs, uploads, and `/data`; do not repartition:

```bash
scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
  --mode update \
  --scope app \
  --skip-disk
```

Pass SSH and sudo credentials through the operation environment or supported flags. Do not echo them in the final report.

A dirty worktree is allowed only when the user explicitly asks to deploy current changes to a test Pi. Confirm the generated manifest reports `sourceDirty=true`, report its base commit, and never describe that build as a clean release. Otherwise stop and require an intentional clean source.

Require the output to show a verified backup path. If the command exits nonzero after application replacement, inspect the recovery handoff, live service, `/health`, release manifest, and exact failing gate before deciding whether deployment succeeded. Prove app scope did not reboot by comparing `uptime -s` before and after.

## Run a full deployment

Use full scope only for host-level work. Add only the relevant host options:

```bash
scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
  --mode update \
  --scope full \
  --skip-disk \
  --desktop xfce-xrdp \
  --rdp-auth passwordless \
  --hotspot-connection-id "${HOTSPOT_CONNECTION_ID}" \
  --hotspot-scan-ssid "${HOTSPOT_SCAN_SSID}" \
  --hotspot-priority "${HOTSPOT_PRIORITY}"
```

Fresh cards use `--mode init --scope full`. Pass RDP credentials only when the selected full flow needs them.

## Verify full deployment before reboot

Confirm that the new release is live and hotspot policy is persisted without switching the active Wi-Fi during deployment:

```bash
ssh "${SSH_TARGET}" 'cat /data/solar-display/release-manifest.json; systemctl is-active solar-display; curl -fsS http://127.0.0.1:3000/health'
ssh "${SSH_TARGET}" 'nmcli -g connection.autoconnect,connection.autoconnect-priority,802-11-wireless.ssid connection show "<connection-name>"; systemctl is-enabled tailscale-hotspot-trigger.timer; systemctl is-active tailscale-hotspot-trigger.timer || true'
```

The timer must be enabled for the next boot. Deployment must not use `systemctl start`, `systemctl restart`, `systemctl enable --now`, `nmcli con up`, or `nmcli con down` to force a mid-deploy switch.

## Perform a real reboot witness for full scope

Reboot when any boot-time contract changed, then wait for the operation-time target to return. Do not claim boot success from deploy-time activation:

```bash
ssh "${SSH_TARGET}" 'sudo reboot'
```

After SSH returns, capture the new boot time and first successful Wi-Fi activation:

```bash
ssh "${SSH_TARGET}" 'uptime -s; systemctl is-active solar-display lightdm xrdp tailscaled; systemctl is-enabled tailscale-hotspot-trigger.timer'
ssh "${SSH_TARGET}" 'sudo journalctl -b -u NetworkManager --no-pager | grep -E "Activation: starting connection|Connected to wireless network|Activation: successful"'
ssh "${SSH_TARGET}" 'nmcli -f GENERAL.CONNECTION,GENERAL.STATE,IP4.ADDRESS device show wlan0; nmcli -f NAME,TYPE,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show'
```

Classify the result explicitly:

- preferred immediately: the first successful wlan0 connection is the selected hotspot;
- recovered later: another profile connects first, then `tailscale-hotspot-trigger.timer` switches to the selected hotspot;
- failed: the selected profile never activates or its configured priority/timer state drifted.

## Verify full-scope kiosk, thermal, and application state

Run the canonical kiosk gate and direct witnesses:

```bash
ssh "${SSH_TARGET}" 'sudo env KIOSK_USER="${USER}" /data/solar-display/deploy/verify-kiosk-install.sh'
ssh "${SSH_TARGET}" 'cat /sys/class/thermal/cooling_device0/cur_state; cat /sys/class/thermal/cooling_device0/max_state; for input in /sys/class/hwmon/hwmon*/fan1_input; do test -r "$input" && printf "%s: " "$input" && cat "$input"; done'
curl -fsS "http://${PI_HOST}:3000/health"
curl -fsS -H 'Accept: text/html' -o /dev/null -w 'overview_http=%{http_code}\n' "http://${PI_HOST}:3000/overview"
ssh "${SSH_TARGET}" 'journalctl -u solar-display -b -p err --no-pager'
```

For the managed Pi 5 thermal profile, require `cur_state` of at least 1, `max_state` of 4, and a positive `fan1_input` RPM after reboot. Use relevant live API endpoints to report playback or MQTT readiness, but do not conflate those data conditions with release deployment.

## Report and recover safely

Report only the evidence applicable to the selected scope:

- deployed release ID and commit;
- local verification result;
- verified backup path;
- unchanged boot time for app scope, or reboot time and autostart evidence for full scope;
- Wi-Fi result, priority, first activation, timer, kiosk, and thermal evidence only for relevant full-scope work;
- external `/health` and page HTTP evidence;
- unrelated live blockers as separate items.

Never automatically restore the production database. If rollback is required, restore the prior application first, run the documented temp restore drill, and require an explicit operator decision before overwriting runtime state. End with 1–3 concrete next-step suggestions required by `AGENTS.md`.
