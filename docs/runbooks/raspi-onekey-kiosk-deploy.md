# Raspberry Pi One-Key Kiosk Deploy

This runbook covers Raspberry Pi 5 running Ubuntu 24.04 Server for the Solar Display kiosk.

## Supported Target

- Ubuntu 24.04 arm64 on Raspberry Pi 5.
- Default user: `pi`.
- Current project installed card: `kz@192.168.31.40`.
- Install path: `/data/solar-display`.
- MQTT broker: pass with `--mqtt-host`, currently `192.168.31.62`.
- Browser: Firefox.
- Lightweight desktop: XFCE + lightdm + xrdp.

SSH and sudo remain password-protected. Local desktop login and RDP desktop entry can be configured to avoid a password prompt for kiosk operations.

## New-Card Init

Before first boot, write `system-boot/user-data` with the interactive helper. The no-argument defaults are `pi/pi` plus root password `kzroot` for local `su -`.

```bash
scripts/prepare-raspi-user-data.sh
```

On Windows:

```powershell
.\scripts\prepare-raspi-user-data.ps1
```

The helper also disables first-boot root auto-grow with `growpart.mode: off` and `resize_rootfs: false`. This is required so a 64G production card keeps free space for the deploy script to create `/data`.

The deploy layout defaults to `/data` fixed at 10GiB. Root uses the remaining leading space. The interactive helper lets you enter a different `/data` size and records it in `system-boot/solar-deploy.env`. During init deployment, the one-key deploy script reads `/boot/firmware/solar-deploy.env` from the Pi unless explicit CLI values are provided.

The helper also writes `solar-first-login-tools.sh` to the boot partition. After the first SSH login, run it if you want minimum maintenance tools and nvm before the full kiosk deployment:

```bash
sudo bash /boot/firmware/solar-first-login-tools.sh
```

It installs `net-tools`, `curl`, `ca-certificates`, `git`, `vim`, `htop`, `tmux`, `rsync`, `parted`, `e2fsprogs`, `ufw`, `avahi-utils`, `mosquitto-clients`, and nvm for the selected kiosk user. It does not disable SSH password authentication or sudo password prompts.

Run from the development machine:

```bash
RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh pi@<pi-ip> \
  --mode init \
  --create-data-partition \
  --data-size-gb 10 \
  --mqtt-host 192.168.31.62 \
  --desktop xfce-xrdp \
  --rdp-auth passwordless
```

Init mode performs host preflight, disk layout checks, `/data` verification, bundle upload, runtime install, Firefox install, XFCE/lightdm/xrdp setup, kiosk install, and verification.

## Daily Update

Use update mode for normal deployments:

```bash
RDP_PASSWORD=pi SSH_PASSWORD=pi scripts/raspi-onekey-deploy.sh pi@<pi-ip> \
  --mode update \
  --skip-disk \
  --mqtt-host 192.168.31.62 \
  --desktop xfce-xrdp \
  --rdp-auth passwordless
```

Update mode must not repartition disks. It preserves:

- `.env`
- `data`
- `logs`
- `uploads/images`
- `uploads/brand`

## 32G Test Card And Production Cards

Card size is detected on the target. The script prints the disk, partition list, root partition size, and `/data` mount status before disk work.

If root already consumes the full card and `/data` does not exist, the script refuses to continue because online root shrink is not supported. Reflash with the desired layout or resize offline before running init.

## MQTT Host

On first install, `--mqtt-host 192.168.31.62` writes the MQTT broker host into `.env` and sets MQTT mode to `mqtt`.

If `.env` already exists, deployment preserves it and prints that MQTT defaults were not overwritten.

Current 2026-06-16 production-card check: `kz@192.168.31.40` has `MQTT_BROKER=192.168.31.62` and `MQTT_DATA_MODE=mqtt`, but `192.168.31.62:1883` is not reachable from either the Pi or the development machine. Fix the broker host, broker port, or firewall on `192.168.31.62` before expecting live MQTT data.

## XFCE xrdp Firefox

`deploy/configure-lightweight-desktop.sh` installs:

- `xfce4`
- `lightdm`
- `xrdp`
- `xorgxrdp`
- `x11-xserver-utils`
- `xfce4-power-manager`
- `dbus-x11`
- `firefox`
- `xfce4-terminal`

lightdm autologins the kiosk user for the local desktop. xrdp is enabled for remote desktop access. Firefox remains the kiosk browser used by `start-solar-kiosk.sh`.

The desktop helper also writes a Raspberry Pi KMS Xorg config and a robust `.xsession`:

- `/etc/X11/xorg.conf.d/99-solar-raspi-kms.conf` pins local Xorg to `/dev/dri/card1`, avoiding the Pi 5 framebuffer fallback error seen as HDMI blinking cursor.
- The kiosk user's `.xsession` runs `dbus-run-session -- startxfce4` with explicit XFCE config/data paths.
- Stale `~/.cache/sessions` and `~/.config/xfce4-session` are removed so old XFCE state does not trigger failsafe session on RDP.
- `deploy/disable-display-sleep.sh` masks `sleep.target`, `suspend.target`, `hibernate.target`, and `hybrid-sleep.target`, writes `/etc/systemd/logind.conf.d/99-solar-no-sleep.conf`, disables `light-locker` and `xscreensaver`, and installs the kiosk user's XFCE autostart script for `xset s off`, `xset s noblank`, and `xset -dpms`.

To reapply only the no-sleep/no-screensaver settings after maintenance:

```bash
sudo /data/solar-display/deploy/disable-display-sleep.sh --user kz
```

If readonly root is already active, temporarily disable readonly root and reboot before rerunning this helper so `/etc/systemd` and the kiosk user's home directory changes persist.

Verify with:

```bash
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target
DISPLAY=:0 XDG_RUNTIME_DIR=/run/user/$(id -u kz) xset q
sudo /data/solar-display/deploy/verify-kiosk-install.sh --kiosk-user kz
```

Expected state: all four systemd targets are `masked`, the X screen saver timeout is `0`, and `DPMS is Disabled`.

RDP passwordless mode is for controlled company LAN use. xrdp `autorun` still requires the RDP client to provide valid credentials before it enters the kiosk session, so Windows no-prompt access is handled by saving `TERMSRV/<pi-ip>` credentials on the Windows PC:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-raspi-rdp.ps1 -HostName <pi-ip> -User pi -Password pi
```

For the current installed card:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-raspi-rdp.ps1 -HostName 192.168.31.40 -User kz -Password kz
```

This does not disable SSH password authentication and does not add sudo passwordless rules.

## Readonly Desktop Controls

The kiosk desktop includes:

- `Enable Read Only System`
- `Temporarily Disable Read Only System`
- `Solar Display Kiosk`

The readonly launchers call fixed helpers under `/home/pi/bin` by default. They do not accept arbitrary commands. Host-level changes still prompt for sudo. On the current project installed card the same paths are under `/home/kz/bin`.

Enable readonly root:

```bash
sudo /data/solar-display/deploy/enable-readonly-root.sh
```

Temporarily disable readonly root:

```bash
/home/pi/bin/readonly-system-disable.sh
```

Both paths require a reboot before the boot-mode change is effective.

## Readonly Apply And Rollback

Do not apply readonly root until service and kiosk verification pass:

```bash
sudo /data/solar-display/deploy/verify-kiosk-install.sh --kiosk-user pi
sudo /data/solar-display/deploy/enable-readonly-root.sh
sudo env APPLY_READONLY_ROOT=1 /data/solar-display/deploy/enable-readonly-root.sh
sudo reboot
```

After reboot:

```bash
findmnt /
findmnt /data
sudo /data/solar-display/deploy/verify-kiosk-install.sh --kiosk-user pi
```

Rollback from an active overlayroot system requires disabling overlayroot through `overlayroot-chroot` and rebooting. The desktop `Temporarily Disable Read Only System` helper performs this fixed operation.

## Requirement Checklist

- Provide a local Raspberry Pi kiosk deployment entrypoint: `scripts/raspi-onekey-deploy.sh`.
- Keep daily update deployments non-destructive: use `--mode update --skip-disk`.
- Gate new-card disk initialization behind detected layout and confirmation: init mode prints layout and refuses root-full/no-`/data`.
- Install and verify kiosk runtime on Ubuntu 24.04 Raspberry Pi: bootstrap checks OS, architecture, runtime, service, launchers, and health.
- Configure lightweight XFCE RDP without weakening SSH or sudo: desktop helper installs XFCE/lightdm/xrdp/Firefox and keeps SSH/sudo protected.
- Preserve MQTT defaults without overwriting target configuration: first install writes defaults; existing `.env` is preserved.
- Gate readonly root apply behind successful verification: `--apply-readonly` runs only after verification.
- Provide fixed desktop controls for readonly system maintenance: desktop launchers call fixed enable/disable helpers.
