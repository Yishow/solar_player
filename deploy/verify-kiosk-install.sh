#!/bin/bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_HOME="${KIOSK_HOME:-}"
KIOSK_HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --install-dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --kiosk-user) KIOSK_USER="${2:-}"; shift 2 ;;
    --kiosk-home) KIOSK_HOME="${2:-}"; shift 2 ;;
    --health-url) KIOSK_HEALTH_URL="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

KIOSK_HOME="${KIOSK_HOME:-/home/${KIOSK_USER}}"
AUTOSTART_LAUNCHER="${KIOSK_HOME}/.config/autostart/firefox-kiosk.desktop"
DESKTOP_LAUNCHER="${KIOSK_HOME}/Desktop/Solar Display Kiosk.desktop"
READONLY_ENABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Enable Read Only System.desktop"
READONLY_DISABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Temporarily Disable Read Only System.desktop"

failures=0

check() {
  local label="$1"
  shift

  if "$@"; then
    echo "OK: ${label}"
  else
    echo "FAIL: ${label}" >&2
    failures=$((failures + 1))
  fi
}

health_ready() {
  local attempt
  for attempt in {1..30}; do
    curl -fsS "${KIOSK_HEALTH_URL}" && return 0
    sleep 1
  done
  return 1
}

path_under_install_dir() {
  local path="$1"
  [[ "${path}" == "${INSTALL_DIR}"/* ]]
}

modules_not_hidden_by_copymods() {
  if ! findmnt /usr/lib/modules >/dev/null 2>&1; then
    return 0
  fi

  local source fstype
  source="$(findmnt -no SOURCE /usr/lib/modules)"
  fstype="$(findmnt -no FSTYPE /usr/lib/modules)"
  [[ "${source}" != "copymods" && "${fstype}" != "tmpfs" ]]
}

firefox_snap_uses_noto_cjk() {
  command -v snap >/dev/null 2>&1 || return 0
  snap list firefox >/dev/null 2>&1 || return 0

  local uid
  uid="$(id -u "${KIOSK_USER}")"
  sudo -u "${KIOSK_USER}" XDG_RUNTIME_DIR="/run/user/${uid}" snap run --shell firefox -c 'fc-match sans:lang=zh-tw' | grep -q 'Noto Sans CJK TC'
}

wifi_connected_when_present() {
  command -v nmcli >/dev/null 2>&1 || return 0
  if ! nmcli -t -f TYPE device status | grep -qx 'wifi'; then
    return 0
  fi

  nmcli -t -f TYPE,STATE device status | grep -qx 'wifi:connected'
}

tailscale_active_when_installed() {
  command -v tailscale >/dev/null 2>&1 || return 0
  systemctl is-active --quiet tailscaled
}

display_sleep_autostart_configured() {
  test -x "${KIOSK_HOME}/.local/bin/solar-disable-display-sleep.sh" &&
    test -f "${KIOSK_HOME}/.config/autostart/solar-disable-display-sleep.desktop" &&
    test -f "${KIOSK_HOME}/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml"
}

display_sleep_disabled_when_x_available() {
  command -v xset >/dev/null 2>&1 || return 0
  [[ -S /tmp/.X11-unix/X0 ]] || return 0

  local uid output
  uid="$(id -u "${KIOSK_USER}")"
  output="$(sudo -u "${KIOSK_USER}" DISPLAY=:0 XDG_RUNTIME_DIR="/run/user/${uid}" xset q 2>/dev/null)" || return 1

  grep -q 'timeout:  0' <<< "${output}" && grep -q 'DPMS is Disabled' <<< "${output}"
}

check "solar-display service is active" systemctl is-active --quiet solar-display
check "health endpoint responds: ${KIOSK_HEALTH_URL}" health_ready
check "kernel modules are not hidden by cloud-initramfs-copymods tmpfs" modules_not_hidden_by_copymods
check "Firefox snap resolves Traditional Chinese to Noto Sans CJK TC when installed" firefox_snap_uses_noto_cjk
check "Wi-Fi is connected when a Wi-Fi device is present" wifi_connected_when_present
check "tailscaled is active when Tailscale is installed" tailscale_active_when_installed
check "display sleep disable autostart is configured" display_sleep_autostart_configured
check "display sleep is disabled when X display is available" display_sleep_disabled_when_x_available
check "autostart launcher exists: ${AUTOSTART_LAUNCHER}" test -f "${AUTOSTART_LAUNCHER}"
check "desktop re-entry launcher exists: ${DESKTOP_LAUNCHER}" test -f "${DESKTOP_LAUNCHER}"
check "desktop re-entry launcher is executable: ${DESKTOP_LAUNCHER}" test -x "${DESKTOP_LAUNCHER}"
check "readonly enable launcher exists: ${READONLY_ENABLE_LAUNCHER}" test -f "${READONLY_ENABLE_LAUNCHER}"
check "readonly enable launcher is executable: ${READONLY_ENABLE_LAUNCHER}" test -x "${READONLY_ENABLE_LAUNCHER}"
check "readonly disable launcher exists: ${READONLY_DISABLE_LAUNCHER}" test -f "${READONLY_DISABLE_LAUNCHER}"
check "readonly disable launcher is executable: ${READONLY_DISABLE_LAUNCHER}" test -x "${READONLY_DISABLE_LAUNCHER}"

for path in \
  "${INSTALL_DIR}/data" \
  "${INSTALL_DIR}/logs" \
  "${INSTALL_DIR}/uploads/images" \
  "${INSTALL_DIR}/uploads/brand"; do
  check "runtime path exists: ${path}" test -d "${path}"
  check "runtime path is under INSTALL_DIR: ${path}" path_under_install_dir "${path}"
  check "runtime path writable by ${KIOSK_USER}: ${path}" sudo -u "${KIOSK_USER}" test -w "${path}"
done

if ! grep -q "Exec=${KIOSK_HOME}/bin/start-solar-kiosk.sh" "${DESKTOP_LAUNCHER}" 2>/dev/null; then
  echo "FAIL: Device Status re-entry guidance is not backed by the desktop launcher start helper: ${DESKTOP_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: desktop launcher invokes fixed start helper"
fi

if ! grep -q "Exec=${KIOSK_HOME}/bin/readonly-system-enable.sh" "${READONLY_ENABLE_LAUNCHER}" 2>/dev/null; then
  echo "FAIL: readonly enable launcher does not invoke fixed helper: ${READONLY_ENABLE_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: readonly enable launcher invokes fixed helper"
fi

if ! grep -q "Exec=${KIOSK_HOME}/bin/readonly-system-disable.sh" "${READONLY_DISABLE_LAUNCHER}" 2>/dev/null; then
  echo "FAIL: readonly disable launcher does not invoke fixed helper: ${READONLY_DISABLE_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: readonly disable launcher invokes fixed helper"
fi

if [[ "${failures}" -gt 0 ]]; then
  echo "Kiosk verification failed with ${failures} issue(s)." >&2
  exit 1
fi

echo "Kiosk verification passed for ${INSTALL_DIR}."
