#!/bin/bash
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-pi}"
DRY_RUN=0
INSTALL_PACKAGES=1

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --user) KIOSK_USER="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-package-install) INSTALL_PACKAGES=0; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

cat <<EOF
Solar Display no-sleep setup
Kiosk user: ${KIOSK_USER}
Package install: ${INSTALL_PACKAGES}
EOF

if [[ "${DRY_RUN}" == "1" ]]; then
  cat <<'EOF'
Dry run stages:
OK: would install x11-xserver-utils, xfconf, and xfce4-power-manager when missing
OK: would mask sleep.target suspend.target hibernate.target hybrid-sleep.target
OK: would write /etc/systemd/logind.conf.d/99-solar-no-sleep.conf
OK: would write kiosk autostart files and XFCE power-manager config
OK: would apply xset no-blanking settings to DISPLAY=:0 when available
EOF
  exit 0
fi

[[ "${EUID}" -eq 0 ]] || fail "Please run as root"
id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"

kiosk_home="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
[[ -n "${kiosk_home}" ]] || fail "Unable to resolve home for ${KIOSK_USER}"
uid="$(id -u "${KIOSK_USER}")"

install_if_missing() {
  [[ "${INSTALL_PACKAGES}" == "1" ]] || return 0

  local packages=()
  command -v xset >/dev/null 2>&1 || packages+=("x11-xserver-utils")
  command -v xfconf-query >/dev/null 2>&1 || packages+=("xfconf")
  dpkg-query -W -f='${Status}' xfce4-power-manager 2>/dev/null | grep -q 'install ok installed' ||
    packages+=("xfce4-power-manager")

  if [[ "${#packages[@]}" -gt 0 ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y "${packages[@]}"
  fi
}

install_if_missing

systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
systemctl daemon-reload

install -d -m 0755 /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/99-solar-no-sleep.conf <<'EOF'
[Login]
IdleAction=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
EOF

install -d -m 0755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" \
  "${kiosk_home}/.local/bin" \
  "${kiosk_home}/.config/autostart" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml"

cat > "${kiosk_home}/.local/bin/solar-disable-display-sleep.sh" <<'EOF'
#!/bin/sh
if command -v xset >/dev/null 2>&1; then
  xset dpms force on >/dev/null 2>&1 || true
  xset s reset >/dev/null 2>&1 || true
  xset s off >/dev/null 2>&1 || true
  xset s noblank >/dev/null 2>&1 || true
  xset -dpms >/dev/null 2>&1 || true
fi

if command -v xfconf-query >/dev/null 2>&1; then
  xfconf-query -c xfce4-power-manager -n -t bool -p /xfce4-power-manager/dpms-enabled -s false >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/blank-on-ac -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/blank-on-battery -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/dpms-on-ac-off -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/dpms-on-ac-sleep -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/dpms-on-battery-off -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t int -p /xfce4-power-manager/dpms-on-battery-sleep -s 0 >/dev/null 2>&1 || true
  xfconf-query -c xfce4-power-manager -n -t bool -p /xfce4-power-manager/presentation-mode -s true >/dev/null 2>&1 || true
fi
EOF

cat > "${kiosk_home}/.config/autostart/solar-disable-display-sleep.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Solar Disable Display Sleep
Exec=${kiosk_home}/.local/bin/solar-disable-display-sleep.sh
OnlyShowIn=XFCE;
X-GNOME-Autostart-enabled=true
EOF

cat > "${kiosk_home}/.config/autostart/light-locker.desktop" <<'EOF'
[Desktop Entry]
Hidden=true
EOF

cat > "${kiosk_home}/.config/autostart/xscreensaver.desktop" <<'EOF'
[Desktop Entry]
Hidden=true
EOF

cat > "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfce4-power-manager" version="1.0">
  <property name="xfce4-power-manager" type="empty">
    <property name="dpms-enabled" type="bool" value="false"/>
    <property name="blank-on-ac" type="int" value="0"/>
    <property name="blank-on-battery" type="int" value="0"/>
    <property name="dpms-on-ac-off" type="int" value="0"/>
    <property name="dpms-on-ac-sleep" type="int" value="0"/>
    <property name="dpms-on-battery-off" type="int" value="0"/>
    <property name="dpms-on-battery-sleep" type="int" value="0"/>
    <property name="presentation-mode" type="bool" value="true"/>
  </property>
</channel>
EOF

chown "${KIOSK_USER}:${KIOSK_USER}" \
  "${kiosk_home}/.local/bin/solar-disable-display-sleep.sh" \
  "${kiosk_home}/.config/autostart/solar-disable-display-sleep.desktop" \
  "${kiosk_home}/.config/autostart/light-locker.desktop" \
  "${kiosk_home}/.config/autostart/xscreensaver.desktop" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml"
chmod 0755 "${kiosk_home}/.local/bin/solar-disable-display-sleep.sh"

sudo -u "${KIOSK_USER}" pkill -x light-locker >/dev/null 2>&1 || true
sudo -u "${KIOSK_USER}" pkill -x xscreensaver >/dev/null 2>&1 || true

if [[ -S /tmp/.X11-unix/X0 ]]; then
  sudo -u "${KIOSK_USER}" \
    env \
    DISPLAY=:0 \
    XDG_RUNTIME_DIR="/run/user/${uid}" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${uid}/bus" \
    "${kiosk_home}/.local/bin/solar-disable-display-sleep.sh" || true
fi

echo "systemd sleep targets:"
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target || true
echo "display sleep autostart:"
test -x "${kiosk_home}/.local/bin/solar-disable-display-sleep.sh"
test -f "${kiosk_home}/.config/autostart/solar-disable-display-sleep.desktop"
test -f "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml"

if [[ -S /tmp/.X11-unix/X0 ]] && command -v xset >/dev/null 2>&1; then
  echo "xset:"
  sudo -u "${KIOSK_USER}" env DISPLAY=:0 XDG_RUNTIME_DIR="/run/user/${uid}" xset q |
    grep -E 'timeout:|DPMS is Disabled|Standby:|Suspend:|Off:' || true
else
  echo "xset: no active X display detected; autostart will apply on next graphical login"
fi
