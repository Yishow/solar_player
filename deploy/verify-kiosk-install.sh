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

check "solar-display service is active" systemctl is-active --quiet solar-display
check "health endpoint responds: ${KIOSK_HEALTH_URL}" health_ready
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
