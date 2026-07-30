# Solar Player Raspberry Pi 5 Deploy Notes

Last updated: 2026-07-30

This file is the handoff entry for the Raspberry Pi 5 kiosk deployment work. Read this first before continuing deployment discussion or running scripts.

AI agents performing a live Pi deployment MUST use the repo-local workflow in `.agents/skills/pi5-deployment/SKILL.md`; this document remains the detailed human handoff and hardware-maintenance reference.

## Operation-Time Connection Target

Set the Pi address or MagicDNS name supplied for the current operation once, then reuse the derived SSH target for SSH, deployment, health checks, and reboot verification. Do not store a project Pi IP in this document.

```bash
PI_HOST="<pi-host-or-magicdns>"
PI_USER="<pi-ssh-user>"
SSH_TARGET="${PI_USER}@${PI_HOST}"
```

For Windows RDP commands in this document, set the same operation-time value:

```powershell
$PiHost = "<pi-host-or-magicdns>"
```

`192.168.31.62` below is MQTT dependency configuration, not the Raspberry Pi connection target.

## Server Clock Responsibility

The Server host clock is the authority for App Time. Before launch, verify the
Server clock and its operator-selected NTP/time-sync service with
`timedatectl status`. If the clock is corrected forward or backward, restart
`solar-display` so Clients receive a new Server Time instance.

Solar Player does not modify the Server or Client OS Clock, OS time zone, NTP
configuration, or host time-sync services. See
[`docs/architecture/server-app-time.md`](docs/architecture/server-app-time.md)
for the App Time states and recovery contract.

## Tailscale Deployment Prerequisite

The one-key bootstrap installs the Tailscale CLI from the official Ubuntu Noble repository and requires `tailscaled.service` to be enabled and active before application replacement. Local deployment verification checks only that package-and-daemon readiness; a fresh node may therefore pass while `tailscale status` reports `NeedsLogin` and has no Tailscale IP.

Enrollment is a separate administrator handoff. This repository does not run `tailscale up` or read or write reusable auth keys. After the administrator completes interactive login or an externally supplied one-time enrollment, the Tailscale control plane assigns the IP address and MagicDNS name. Put that current value in `PI_HOST`, rebuild `SSH_TARGET`, and do not save a fixed Pi address in repository files.

If the Tailscale CLI is absent or `tailscaled.service` is not persistently enabled (`systemctl is-enabled tailscaled.service` must report exactly `enabled`) while readonly overlay root is active, deployment stops before application replacement. Temporarily disable readonly root and reboot, then rerun deployment so the package and systemd enablement persist. An already enabled but temporarily inactive daemon can be started without changing the readonly filesystem.

## Pi 5 Minimum Fan Stage

The managed Pi 5 profile uses `dtparam=fan_temp0=0`, `fan_temp0_hyst=5000`, and PWM 75 so the kernel `step_wise` governor keeps the existing lowest fan stage active at normal positive CPU temperatures. The remaining speed-up trips stay at 60000, 67500, and 75000 m°C; no userspace fan daemon or timer is installed.

After deploying a changed profile, reboot before treating it as active. Once SSH is reachable again, verify within 20 seconds that cooling state is at least 1 and `fan1_input` is greater than 0:

```bash
ssh "${SSH_TARGET}" 'cat /sys/class/thermal/cooling_device0/cur_state; for input in /sys/class/hwmon/hwmon*/fan1_input; do test -r "$input" && printf "%s: " "$input" && cat "$input"; done'
ssh "${SSH_TARGET}" 'sudo env KIOSK_USER="${USER}" /data/solar-display/deploy/verify-kiosk-install.sh'
```

Rollback requires restoring `dtparam=fan_temp0=50000` in the Solar Player managed block, rebooting, and restoring the previous release before another deployment; otherwise the current helper will apply the 0 m°C baseline again.

## 64G Production Card Quick Start

Use this path for the real kiosk card. The order matters.

1. On Windows 11, flash Ubuntu 24.04 Server arm64 for Raspberry Pi.
2. Before the first Pi boot, mount the `system-boot` partition and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\prepare-raspi-user-data.ps1
   ```

   Accepting the defaults creates `pi/pi`, installs SSH on first boot, disables first-boot root auto-grow with `growpart.mode: off` and `resize_rootfs: false`, records `DATA_SIZE_GB=10` in `solar-deploy.env`, and writes `solar-first-login-tools.sh`. The `pi` default and `/data` size can be changed in the interactive menu.

3. Insert the card into the Pi and boot it. Wait for cloud-init to finish.
4. Confirm SSH and sudo:

   ```bash
   ssh "${SSH_TARGET}"
   sudo whoami
   ```

5. Optional but recommended on a fresh card: install minimum maintenance tools and nvm after first login:

   ```bash
   sudo bash /boot/firmware/solar-first-login-tools.sh
   ```

6. From the development machine, run init deploy. In init mode, the deploy script reads `/boot/firmware/solar-deploy.env` from the Pi and uses its `DATA_SIZE_GB` / `MQTT_HOST` values unless you pass explicit CLI overrides:

   ```bash
   RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
     --mode init \
     --scope full \
     --create-data-partition \
     --data-size-gb 10 \
     --mqtt-host 192.168.31.62 \
     --desktop xfce-xrdp \
     --rdp-auth passwordless
   ```

7. Verify kiosk, RDP, desktop re-entry, and MQTT. Only then apply readonly root:

   ```bash
   RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
     --mode update \
     --scope full \
     --skip-disk \
     --mqtt-host 192.168.31.62 \
     --desktop xfce-xrdp \
     --rdp-auth passwordless \
     --apply-readonly
   ```

Do not boot the card once before running the user-data helper. If Ubuntu grows root to the full 64G card, the deploy script must refuse online shrink and `/data` cannot be created safely by the one-key flow.

## Installed-Card Profile

- Resolve the maintenance target from `PI_HOST` and `SSH_TARGET` for each operation.
- SSH password: `kz`
- sudo password: `kz`
- Generic fresh-card default user: `pi`
- The `kz` account is only for this project's current installed card.
- MQTT dependency broker: `192.168.31.62`
- OS verified: Ubuntu 24.04.4 LTS arm64 on Raspberry Pi 5
- Current disk state after one-key init:
  - `/dev/mmcblk0p1`: `system-boot`
  - `/dev/mmcblk0p2`: lower root, about 47.5G
  - `/dev/mmcblk0p3`: `/data`, 10G ext4

Post-reboot readonly verification passed on 2026-06-17 for the operation-selected target:

- `/` source is `overlayroot`
- `/` is mounted as overlay with `lowerdir=/media/root-ro` and `upperdir=/media/root-rw/overlay`
- `/data` is `/dev/mmcblk0p3` mounted `rw,noatime`
- `solar-display`, `xrdp`, `xrdp-sesman`, and `lightdm` are active
- `/data/solar-display/logs` remains writable after readonly reboot
- `sudo env KIOSK_USER=kz /data/solar-display/deploy/verify-kiosk-install.sh` passes
- `http://${PI_HOST}:3000/health` is reachable from the development machine
- `http://${PI_HOST}:3000/api/playback/pages` reports all five pages `playable` with `skipCount: 0`
- agent-browser opened `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability` successfully

Current maintenance state after the 2026-06-17 apt maintenance window:

- Readonly root is currently disabled for maintenance: `/` is `/dev/mmcblk0p2 ext4 rw,relatime`, and `/etc/overlayroot.local.conf` contains `overlayroot=n`.
- `apt update` and `apt upgrade -y` completed; `apt-get -s upgrade` reports `0 upgraded, 0 newly installed, 0 to remove`, and `/var/run/reboot-required` is absent after the final reboot.
- Wi-Fi is restored: `wlan0` connects to `netplan-wlan0-AX3600`.
- Tailscale is restored, and SSH is reachable through the operation-selected target.
- Firefox snap Traditional Chinese font fallback is repaired: snap-local `fc-match sans:lang=zh-tw` resolves to `Noto Sans CJK TC`, and the kiosk Firefox profile has `font.name*.zh-TW` preferences in `user.js`.
- Playback service remains healthy: `http://127.0.0.1:3000/health` returns `{"status":"ok"}`, and `/api/playback/pages` responds.
- No failed systemd units were present in the final verification.

Important root cause from this maintenance window:

- `cloud-initramfs-copymods` can mount `/usr/lib/modules` as a `copymods` tmpfs. If kernel modules are installed while that tmpfs is active, `modprobe` can work until reboot, but the real root filesystem still lacks the new modules.
- The visible symptom was `WIFI-HW missing`, no `wlan0`, and `tailscaled` failing because `brcmfmac`, `ip_tables`, `nf_tables`, and related modules were not visible after reboot.
- The durable fix is to run `sudo KIOSK_USER=<user> ./deploy/repair-kiosk-system.sh` after apt/kernel maintenance and before the reboot verification. The script syncs live `/usr/lib/modules/<kernel>` back to the underlying root when `copymods` is active, and it also repairs Firefox snap CJK font visibility.

Recommended apt maintenance sequence for this card:

```bash
sudo ./deploy/readonly-system-disable.sh
sudo reboot

sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
sudo KIOSK_USER=kz ./deploy/repair-kiosk-system.sh
sudo reboot

sudo KIOSK_USER=kz ./deploy/verify-kiosk-install.sh
```

Only re-enable readonly root after the verification script passes and the display has been visually checked.

Additional desktop repair completed on 2026-06-16 after a reboot exposed HDMI/RDP issues:

- Symptom: HDMI showed only a blinking cursor; RDP entered XFCE failsafe with `Unable to load a failsafe session`.
- Root cause 1: local Xorg selected the wrong Raspberry Pi DRM card and failed with `Cannot run in framebuffer mode. Please specify busIDs for all framebuffer devices`.
- Root cause 2: the kiosk user's XFCE session state/cache was stale, and the generated `.xsession` did not force a clean D-Bus-backed XFCE start.
- Root cause 3: xrdp Xorg inherited the global Raspberry Pi KMS config and died in `.xorgxrdp.10.log` at `parse_vt_settings: Cannot open /dev/tty0 (Permission denied)`.
- Root cause 4: the server-image desktop install path did not include `xserver-xorg-input-libinput`, so the local `:0` Xorg session came up with only `Virtual core pointer`/`keyboard` and never attached the real USB mouse or keyboard even though the kernel exposed them via `/proc/bus/input/devices`.
- Live Pi fix: `/etc/X11/xorg.conf.d/99-solar-raspi-kms.conf` now pins Xorg to `/dev/dri/card1`; `/home/kz/.xsession` now runs `dbus-run-session -- startxfce4`; stale `~/.cache/sessions` and `~/.config/xfce4-session` were removed.
- Additional live Pi fix on 2026-06-17: `/etc/xrdp/sesman.ini` `[Xorg]` now passes `param=-configdir` and `param=/etc/X11/xrdp/xorg.conf.d`, so the RDP Xorg session does not ingest the local HDMI-only KMS device config.
- Persistence: the same files/cache cleanup were also written through `overlayroot-chroot`, so the current readonly card should keep the repair after reboot.
- Script fix: `deploy/configure-lightweight-desktop.sh` now writes the robust `.xsession`, clears stale XFCE session cache, installs the Raspberry Pi KMS Xorg config, installs `xserver-xorg-input-libinput` for the local LightDM seat, and injects the xrdp-only `-configdir /etc/X11/xrdp/xorg.conf.d` guard into `sesman.ini` for future installs. `scripts/deploy.test.mjs` includes regression coverage for this xrdp configdir path.
- Post-repair service/process check: `lightdm`, `xrdp`, `xrdp-sesman`, and `solar-display` were active; XFCE spawned `xfwm4`, `xfsettingsd`, `xfce4-panel`, and `xfdesktop`.
- Repeated after this repair on 2026-06-17: readonly reboot witness passed; `lightdm`, `xrdp`, `xrdp-sesman`, `solar-display`, and the Firefox kiosk process were active.

## Current MQTT Blocker

The Pi keeps `MQTT_BROKER=192.168.31.62`, but the live maintenance target is currently stored in mock mode because the broker is unreachable.

As of the 2026-06-16 post-reboot check:

- Pi runtime status reports broker `192.168.31.62:1883`, `connected: false`, and `reason: "mock"` after the 2026-06-17 readonly reboot
- Pi-to-broker TCP test to `192.168.31.62:1883` fails
- Development-machine TCP test to `192.168.31.62:1883` also times out
- SSH to `192.168.31.62:22` times out

This points to the broker host, broker port, or firewall on `192.168.31.62`; it is not a Pi `.env` or deployment-path issue.

## Current Demo Workaround

As of 2026-06-17, the live maintenance target was switched to `mock` mode so the playback stack can be demonstrated while the MQTT broker remains unreachable.

- Runtime status reports `reason: "mock"`
- All five playback pages are `playable`
- The `mock` mode was saved through the management API on the Pi, not only by editing `.env`; changing `.env` after the first seed does not override an existing `mqtt_settings` row
- `apps/server/src/services/MockMetricsFeedService.ts` now writes a full 14-metric mock dataset, not only `realTimePower`
- The mock feed is intentionally active only in `mock` mode; switching back to `mqtt` mode restores the real broker dependency
- The mock feed follows a day/night solar curve, so `todayGeneration`, `todayCo2Reduction`, and related daylight metrics will read `0.0` overnight rather than showing fake daytime output

## Writable Runtime Boundary

The app runtime must live under:

```text
/data/solar-display
```

These must stay writable after readonly root:

```text
/data/solar-display/data
/data/solar-display/logs
/data/solar-display/uploads/images
/data/solar-display/uploads/brand
```

If `/data` is only a directory under `/`, readonly overlay will make runtime state unsafe or non-persistent. On the current 64G card `/data` is a real partition.

## Fast Way To Make `su -` Available On Pi 5

For an already booted system where sudo works, the fastest live fix is:

```bash
sudo passwd root
su -
```

This enables local/root-console `su -`. It does not require rebuilding the SD card.

For a fresh Ubuntu Raspberry Pi image before first boot, use one of the helper scripts to write `system-boot/user-data`. With no arguments, both helpers open an interactive menu and default to `pi/pi`, because `kz` is project-specific.

macOS / Linux:

```bash
scripts/prepare-raspi-user-data.sh
```

Windows PowerShell:

```powershell
.\scripts\prepare-raspi-user-data.ps1
```

The scripts back up the original file to:

```text
user-data.before-solar-player
```

They also write:

```text
solar-deploy.env
solar-first-login-tools.sh
```

`solar-deploy.env` records the selected deployment defaults:

```bash
DATA_SIZE_GB=10
KIOSK_USER=pi
MQTT_HOST=192.168.31.62
```

During init deployment, `scripts/raspi-onekey-deploy.sh` automatically reads `/boot/firmware/solar-deploy.env` from the Pi. Explicit `--data-size-gb` or `--mqtt-host` command-line values still take precedence.

After the first Pi login, run the maintenance tools script if you want basic troubleshooting tools and nvm before the full kiosk deploy:

```bash
sudo bash /boot/firmware/solar-first-login-tools.sh
```

The script installs `locales`, `language-pack-zh-hant`, `language-pack-gnome-zh-hant`, `fonts-noto-cjk`, `net-tools`, `curl`, `ca-certificates`, `im-config`, `fcitx5`, `fcitx5-chewing`, `fcitx5-table-boshiamy`, `git`, `vim`, `htop`, `tmux`, `rsync`, `parted`, `e2fsprogs`, `ufw`, `avahi-utils`, `mosquitto-clients`, and nvm for the selected kiosk user. It does not change SSH password authentication or sudo password policy.

The first-login tools also append `zh_TW.UTF-8 UTF-8` to `/etc/locale.gen`, run `locale-gen zh_TW.UTF-8`, and call `update-locale LANG=zh_TW.UTF-8 LANGUAGE=zh_TW:zh`, so the next boot uses Traditional Chinese by default.

The desktop helper also installs `network-manager-gnome`, `policykit-1-gnome`, `im-config`, `fcitx5`, `fcitx5-chewing`, and `fcitx5-table-boshiamy`, writes `~/.xprofile` with `GTK_IM_MODULE=fcitx`, `QT_IM_MODULE=fcitx`, and `XMODIFIERS=@im=fcitx`, writes `~/.xinputrc` with `run_im fcitx5`, seeds `~/.config/fcitx5/profile` so the kiosk user starts with `keyboard-us`, `boshiamy`, and `chewing` in the default group, calls `deploy/disable-display-sleep.sh` so system sleep, X11 screen blanking, DPMS, screensaver, and XFCE display sleep stay disabled for the kiosk user, writes `/etc/NetworkManager/conf.d/10-solar-managed.conf` plus `/etc/netplan/90-solar-network-manager.yaml` so Wi-Fi can be managed from the desktop after the next reboot, and writes `/etc/polkit-1/rules.d/49-solar-networkmanager.rules` so the kiosk user can switch Wi-Fi and modify saved NetworkManager connections without repeated admin-auth prompts.

## RPi5 No-Sleep And Screen Saver Disablement

For a kiosk display, the Raspberry Pi 5 must not enter system sleep, blank the HDMI screen, or fall back to a screen saver. New deployments apply this through `deploy/configure-lightweight-desktop.sh`, which delegates the sleep/display portion to:

```bash
sudo /data/solar-display/deploy/disable-display-sleep.sh --user kz
```

The helper is idempotent and can be run by itself after app-only updates or manual desktop maintenance. It installs missing `x11-xserver-utils`, `xfconf`, and `xfce4-power-manager`; masks `sleep.target`, `suspend.target`, `hibernate.target`, and `hybrid-sleep.target`; writes `/etc/systemd/logind.conf.d/99-solar-no-sleep.conf`; writes the kiosk user's `solar-disable-display-sleep.sh` autostart; disables `light-locker` and `xscreensaver`; and immediately applies `xset dpms force on`, `xset s reset`, `xset s off`, `xset s noblank`, and `xset -dpms` to `DISPLAY=:0` when the local X session exists.

If readonly root is already active, temporarily disable readonly root and reboot before rerunning this helper so `/etc/systemd` and the kiosk user's home directory changes persist.

Verify the no-sleep state with:

```bash
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target
DISPLAY=:0 XDG_RUNTIME_DIR=/run/user/$(id -u kz) xset q
sudo /data/solar-display/deploy/verify-kiosk-install.sh --kiosk-user kz
```

Expected signals are all four systemd targets reporting `masked`, `Screen Saver` showing `timeout: 0`, and `DPMS is Disabled`. `verify-kiosk-install.sh` checks both the system sleep mask and the kiosk user's autostart/X display state.

They write this cloud-init shape:

```yaml
#cloud-config
hostname: raspberry5
manage_etc_hosts: true
timezone: Asia/Taipei
ssh_pwauth: true
growpart:
  mode: off
resize_rootfs: false

users:
  - name: pi
    groups: [adm, cdrom, dip, lxd, sudo]
    sudo: ["ALL=(ALL) ALL"]
    shell: /bin/bash
    lock_passwd: false

chpasswd:
  expire: false
  users:
    - {name: pi, password: "pi", type: text}
    - {name: root, password: "kzroot", type: text}

package_update: true
package_upgrade: false
packages:
  - sudo
  - openssh-server
  - avahi-daemon

write_files:
  - path: /etc/growroot-disabled
    permissions: "0644"
    owner: root:root
    content: |
      disabled by Solar Player first-boot setup; /data is created by raspi-onekey-deploy.sh
  - path: /etc/ssh/sshd_config.d/99-solar-player.conf
    permissions: "0644"
    owner: root:root
    content: |
      PasswordAuthentication yes
      KbdInteractiveAuthentication yes
      PermitRootLogin no

runcmd:
  - systemctl enable --now ssh
  - systemctl enable --now avahi-daemon
```

Why this works:

- cloud-init `users` supports `groups`, `sudo`, `lock_passwd`, and SSH-related user configuration.
- cloud-init `chpasswd.users` sets passwords during first boot; this is used for `pi` and local root `su -`. Do not use deprecated `chpasswd.list`.
- cloud-init `growpart.mode: off` and `resize_rootfs: false` prevent the first boot from expanding root to the full card; this leaves free space for `/data`.
- cloud-init package install supports `package_update`, `package_upgrade`, and `packages`; specifying `openssh-server` installs SSH during first boot.
- `runcmd` enables `ssh` after package installation.

`apt upgrade` is not required for SSH to exist. The important first-boot pieces are `package_update: true` and `packages: [openssh-server]`. Use `--package-upgrade` only if you want first boot to spend more time upgrading installed packages.

Security boundary:

- `su -` needs the root password.
- SSH login still uses the kiosk user password, default `pi`.
- sudo still asks for the kiosk user password.
- Do not enable root SSH login for this kiosk. If needed, explicitly keep root SSH disabled with:

```yaml
write_files:
  - path: /etc/ssh/sshd_config.d/99-no-root-login.conf
    permissions: "0644"
    content: |
      PermitRootLogin no
```

If sudo is broken but `su -` works on the Pi console, repair from root:

```bash
apt update
apt install -y sudo openssh-server
usermod -aG sudo pi
systemctl enable --now ssh
```

Then log out and back in as `pi`.

## Preferred Fresh-Card Flow

Use Ubuntu 24.04 Server arm64 Raspberry Pi image, not full Ubuntu Desktop.

Before first boot:

1. Write the image.
2. Mount the SD card boot partition on Windows, Mac, or Ubuntu.
3. Run `scripts/prepare-raspi-user-data.sh` / `.ps1`.
4. Confirm the generated `user-data` contains `growpart.mode: off` and `resize_rootfs: false`.
5. Ensure `pi` is in the `sudo` group.
6. Enable SSH through `openssh-server`.
7. Optionally set a root password for `su -`.

After first SSH is available:

```bash
ssh "${SSH_TARGET}"
sudo whoami
su -
```

## One-Key Deploy Script

Primary local entry:

```bash
scripts/raspi-onekey-deploy.sh "${SSH_TARGET}"
```

The deploy entry has two explicit scopes:

- `--scope app` is the normal installed-application update. With `--mode update` it is also the default. It backs up and replaces application files, installs production dependencies, restarts the existing service, and verifies the release manifest, service, and `/health`. It does not run apt, Tailscale, disk, environment, desktop, kiosk, boot, hotspot, readonly, full verifier, or reboot actions.
- `--scope full` is for fresh-card deployment, redeployment, or host-level changes. With `--mode init` it is also the default. It retains the full disk, OS, desktop/RDP, kiosk/autostart, boot, fan, Wi-Fi/hotspot, readonly-root, and applicable reboot-witness flow.

An explicit request to send the current dirty worktree to a test Pi may use app scope. The generated `release-manifest.json` must retain `sourceDirty: true` and the base commit must be reported; it is not a clean release.

The one-key deploy script derives the kiosk Linux user from `SSH_TARGET`. Set `PI_USER=pi` for a generic new card or `PI_USER=kz` for the current installed card, then rebuild `SSH_TARGET`; alternatively pass `--kiosk-user <user>` explicitly.

Normal update:

```bash
SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
  --mode update \
  --scope app \
  --skip-disk
```

Update mode always runs a fail-closed runtime backup gate on the target before replacing application files:

1. Stop `solar-display` when active.
2. Create `backups/<timestamp>/` under the install root via `deploy/export-runtime-state.sh` (runtime archive, SHA-256 sidecar, prior application archive, versioned manifest; directory mode 0700, files 0600).
3. Only after archive + sidecar + manifest verification succeeds, copy the new bundle.
4. On backup failure the update exits nonzero, restores the previous service state, and does **not** replace application files.
5. On later install/health failure the bootstrap prints prior application path, runtime archive path, and restore commands; it never automatically restores the production database.

Dry-run (no target changes) lists these stages:

```bash
scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" --mode update --scope app --dry-run
```

### Restore drill and explicit production restore

Prefer temp drill first (does not touch production install root or service):

```bash
# On the Pi, after noting BACKUP_DIR from update output:
sudo /data/solar-display/deploy/restore-runtime-state.sh \
  --backup-dir /data/solar-display/backups/<timestamp> \
  --drill
```

Only after operator decision, overwrite mutable runtime state with the documented confirmation token:

```bash
sudo /data/solar-display/deploy/restore-runtime-state.sh \
  --backup-dir /data/solar-display/backups/<timestamp> \
  --target-root /data/solar-display \
  --confirm RESTORE-OVERWRITE
```

Do not upload unencrypted backup directories; archives may contain `.env` secrets (`containsSecrets: true` in the manifest).

Fresh-card init for a 64G production card after the first SSH login. `/data` is fixed at 10GiB by default; root uses the remaining leading space.

```bash
RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
  --mode init \
  --scope full \
  --create-data-partition \
  --data-size-gb 10 \
  --mqtt-host 192.168.31.62 \
  --desktop xfce-xrdp \
  --rdp-auth passwordless
```

This is the command that creates `/data` from the free space left by disabled growpart. If you accidentally booted once without disabling growpart, root may already consume the full 64G card and this command will correctly refuse to shrink root online.

Final readonly apply, only after verification passes:

```bash
RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh "${SSH_TARGET}" \
  --mode update \
  --scope full \
  --skip-disk \
  --mqtt-host 192.168.31.62 \
  --desktop xfce-xrdp \
  --rdp-auth passwordless \
  --apply-readonly
```

## Desktop Design

Use lightweight desktop, not GNOME.

Installed stack:

- XFCE
- lightdm
- xrdp
- xorgxrdp
- Firefox
- xdg-utils
- xfce4-terminal

Login policy:

- Local desktop autologin: enabled for the kiosk user, default `pi`
- RDP desktop entry: xrdp can autorun the kiosk session after the RDP client supplies valid credentials
- Windows credential prompt: if you still see an RDP password prompt after the Pi-side `SolarKiosk` autorun fix, that prompt is from the Windows client credential cache, not the Pi login screen
- Windows no-prompt RDP: use `scripts/connect-raspi-rdp.ps1` once with `$PiHost` to store the operation-selected target credentials in Windows Credential Manager
- SSH: password required
- sudo: password required

Firefox is the main kiosk browser.

Manual desktop polish is available without rerunning the full deploy flow:

```bash
sudo deploy/apply-desktop-theme.sh --user kz
```

The script installs a balanced XFCE theme profile:

- GTK / xfwm theme: `Arc-Darker`
- icon theme: `Papirus-Dark`
- cursor theme: `DMZ-White`
- UI fonts: `Noto Sans CJK TC` + `Noto Sans Mono`

It only touches desktop appearance files under the kiosk user's home directory plus the required theme/font packages. It does not modify xrdp, NetworkManager, polkit, autologin, or kiosk startup behavior.

Raspberry Pi 5 desktop hardening included in `deploy/configure-lightweight-desktop.sh`:

- Writes a robust kiosk `.xsession` that exports XFCE config/data paths and runs `dbus-run-session -- startxfce4`.
- Clears stale `~/.cache/sessions` and `~/.config/xfce4-session` before writing the session.
- Writes `/etc/X11/xorg.conf.d/99-solar-raspi-kms.conf` with `Option "kmsdev" "/dev/dri/card1"` to avoid HDMI/local Xorg falling back to framebuffer mode on this Pi 5 layout.

On Windows PowerShell, use the operation-time target:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-raspi-rdp.ps1 -HostName $PiHost -User kz -Password kz
```

If Windows saved a wrong credential, clear it first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-raspi-rdp.ps1 -HostName $PiHost -DeleteCredential
```

## Desktop Launchers

The kiosk desktop should contain:

```text
Solar Display Kiosk
Enable Read Only System
Temporarily Disable Read Only System
```

Readonly launchers call fixed helpers under `/home/pi/bin` by default and still require sudo for host-level changes. On the current project installed card this path remains `/home/kz/bin`.

## Verification Commands

Local:

```bash
node scripts/deploy.test.mjs
bash -n scripts/raspi-onekey-deploy.sh deploy/raspi-bootstrap.sh deploy/export-runtime-state.sh deploy/restore-runtime-state.sh deploy/configure-lightweight-desktop.sh deploy/apply-desktop-theme.sh deploy/install-kiosk.sh deploy/enable-readonly-root.sh deploy/verify-kiosk-install.sh deploy/readonly-system-enable.sh deploy/readonly-system-disable.sh
```

Remote disk check:

```bash
ssh "${SSH_TARGET}" 'findmnt -no SOURCE,TARGET,FSTYPE,OPTIONS /; findmnt /data || true; lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS'
```

Remote kiosk check after deployment:

```bash
ssh "${SSH_TARGET}" 'curl -fsS http://127.0.0.1:3000/health && sudo env KIOSK_USER="${USER}" /data/solar-display/deploy/verify-kiosk-install.sh'
```

Readonly check after reboot:

```bash
ssh "${SSH_TARGET}" 'findmnt /; findmnt /data; sudo env KIOSK_USER="${USER}" /data/solar-display/deploy/verify-kiosk-install.sh'
```

Expected:

- `/` source is `overlayroot`
- `/data` is a real disk partition and writable
- `solar-display` service active
- health endpoint OK
- Firefox kiosk can launch
- RDP XFCE desktop works
- desktop launchers exist

## Spectra State

Change:

```text
add-raspi-onekey-kiosk-deploy
```

Current progress at the time this file was written:

- final Pi manual witness with real `/data`, readonly apply, reboot, and post-reboot verification completed on the operation-selected target
- HDMI/RDP repair was verified after the 2026-06-17 readonly reboot
- remaining external issue: MQTT broker `192.168.31.62:1883` is unreachable from both the Pi and development machine

## Related Files

- `scripts/raspi-onekey-deploy.sh`
- `scripts/prepare-raspi-user-data.sh`
- `scripts/prepare-raspi-user-data.ps1`
- `deploy/raspi-bootstrap.sh`
- `deploy/export-runtime-state.sh`
- `deploy/restore-runtime-state.sh`
- `deploy/configure-lightweight-desktop.sh`
- `deploy/readonly-system-enable.sh`
- `deploy/readonly-system-disable.sh`
- `deploy/enable-readonly-system.desktop`
- `deploy/disable-readonly-system.desktop`
- `docs/runbooks/raspi-onekey-kiosk-deploy.md`
- `openspec/changes/protect-runtime-backup-and-restore/`

## Device Status log truth and release identity

Production server logs are **journald unit `solar-display`**, not files under `LOG_DIR`.

### Journal reader (least privilege)

- Helper source: `deploy/read-solar-display-journal.sh`
- Installed path: `/usr/local/sbin/read-solar-display-journal.sh` (root-owned, mode 755)
- Sudoers drop-in: `/etc/sudoers.d/solar-display-journal` (mode 440)
- Allowed invocations only:
  - `sudo -n /usr/local/sbin/read-solar-display-journal.sh recent <1..500>`
  - `sudo -n /usr/local/sbin/read-solar-display-journal.sh export <1..500>`
- Unit, boot scope (`-b`), and output formats are fixed inside the helper. Callers cannot pass unit names, paths, or extra journalctl flags.
- Installer (`deploy/install-kiosk.sh`) renders the sudoers drop-in to a temp file, runs `visudo -cf`, and **aborts without installing** on syntax failure.

### Device Status API

- `GET /api/device/logs?limit=N` — trusted management only; JSON `{ source, available, entries, retention, unavailableReason }`
- `GET /api/device/logs/export?limit=N` — trusted management only; `text/plain` attachment, bounded to 500 records
- Untrusted callers receive 403 **before** any helper spawn
- When journal/helper/sudo is unavailable, responses are **503 with an explicit reason** — never a successful empty `.log` file listing

### Release identity

- Bundle/direct deploy generates `release-manifest.json` via `scripts/generate-release-manifest.mjs`
- Fields: `releaseId`, `commit`, `builtAt`, `packageVersion`, `schemaVersion` (highest DB migration), `sourceDirty`
- Runtime Device Status reads the installed manifest (default `<install-root>/release-manifest.json`, overridable with `RELEASE_MANIFEST_PATH`)
- Missing/corrupt manifest → release identity unavailable with a bounded reason; **server stays healthy**
- `/health` does **not** read or validate the release manifest

### Failure runbook (operator)

1. Inject or reproduce a `solar-display` error, then confirm host truth:
   ```bash
   sudo journalctl -u solar-display -b -n 50 --no-pager
   ```
2. Confirm the least-privilege reader (as kiosk user):
   ```bash
   sudo -n /usr/local/sbin/read-solar-display-journal.sh recent 20
   ```
3. From a trusted management session, open Device Status and verify the same bounded record appears under Journald.
4. Compare Device Status **Release ID** with the deployed manifest:
   ```bash
   cat /data/solar-display/release-manifest.json
   ```
5. If Device Status shows journal unavailable:
   - helper missing → re-run `sudo ./deploy/install-kiosk.sh`
   - sudo denied → check `/etc/sudoers.d/solar-display-journal` and `visudo -cf`
   - journald missing → host is not a production Linux journal host; treat as unavailable (do not fall back to scanning host paths)
