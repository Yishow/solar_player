#!/bin/bash
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-pi}"
DRY_RUN=0

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --user) KIOSK_USER="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

echo "XFCE display hotplug popups: disabled for ${KIOSK_USER}"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run only; no XFCE display settings changed"
  exit 0
fi

[[ "${EUID}" -eq 0 ]] || fail "Please run as root"
id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"
command -v xfconf-query >/dev/null 2>&1 || fail "Missing xfconf-query; install xfce4-settings"
command -v dbus-run-session >/dev/null 2>&1 || fail "Missing dbus-run-session; install dbus-x11"

kiosk_home="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
kiosk_uid="$(id -u "${KIOSK_USER}")"
install -d -m 755 -o "${KIOSK_USER}" -g "${KIOSK_USER}" \
  "${kiosk_home}/.config" \
  "${kiosk_home}/.config/xfce4" \
  "${kiosk_home}/.config/xfce4/xfconf" \
  "${kiosk_home}/.config/xfce4/xfconf/xfce-perchannel-xml"

run_xfconf() {
  if [[ -S "/run/user/${kiosk_uid}/bus" ]]; then
    sudo -u "${KIOSK_USER}" HOME="${kiosk_home}" XDG_CONFIG_HOME="${kiosk_home}/.config" \
      XDG_RUNTIME_DIR="/run/user/${kiosk_uid}" \
      DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${kiosk_uid}/bus" \
      xfconf-query "$@"
    return
  fi

  sudo -u "${KIOSK_USER}" HOME="${kiosk_home}" XDG_CONFIG_HOME="${kiosk_home}/.config" \
    dbus-run-session -- xfconf-query "$@"
}

run_xfconf -c displays -p /Notify -n -t int -s 0
run_xfconf -c displays -p /IdentityPopups -n -t bool -s false
run_xfconf -c displays -p /AutoEnableProfiles -n -t int -s 0

echo "XFCE display settings now suppress hotplug dialogs and identity popups"
