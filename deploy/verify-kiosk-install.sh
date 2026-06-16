#!/bin/bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
KIOSK_USER="${KIOSK_USER:-kz}"
KIOSK_HOME="${KIOSK_HOME:-/home/${KIOSK_USER}}"
KIOSK_HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"
AUTOSTART_LAUNCHER="${KIOSK_HOME}/.config/autostart/firefox-kiosk.desktop"
DESKTOP_LAUNCHER="${KIOSK_HOME}/Desktop/Solar Display Kiosk.desktop"

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

path_under_install_dir() {
  local path="$1"
  [[ "${path}" == "${INSTALL_DIR}"/* ]]
}

check "solar-display service is active" systemctl is-active --quiet solar-display
check "health endpoint responds: ${KIOSK_HEALTH_URL}" curl -fsS "${KIOSK_HEALTH_URL}"
check "autostart launcher exists: ${AUTOSTART_LAUNCHER}" test -f "${AUTOSTART_LAUNCHER}"
check "desktop re-entry launcher exists: ${DESKTOP_LAUNCHER}" test -f "${DESKTOP_LAUNCHER}"
check "desktop re-entry launcher is executable: ${DESKTOP_LAUNCHER}" test -x "${DESKTOP_LAUNCHER}"

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

if [[ "${failures}" -gt 0 ]]; then
  echo "Kiosk verification failed with ${failures} issue(s)." >&2
  exit 1
fi

echo "Kiosk verification passed for ${INSTALL_DIR}."
