#!/bin/bash
set -euo pipefail

KIOSK_URL="${KIOSK_URL:-http://127.0.0.1:3000/overview}"
HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/solar-display"
LOG_FILE="${LOG_DIR}/kiosk-launcher.log"
WAIT_SECONDS="${KIOSK_WAIT_SECONDS:-120}"
START_DELAY_SECONDS="${KIOSK_START_DELAY:-5}"
DESKTOP_LAUNCHER="${KIOSK_DESKTOP_LAUNCHER:-$HOME/Desktop/Solar Display Kiosk.desktop}"

mkdir -p "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "${LOG_FILE}"
}

trust_desktop_launcher() {
  if [[ ! -f "${DESKTOP_LAUNCHER}" || -z "${XDG_RUNTIME_DIR:-}" || -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    return
  fi

  if command -v gio >/dev/null 2>&1; then
    gio set "${DESKTOP_LAUNCHER}" metadata::trusted true >/dev/null 2>&1 || true
  fi
}

resolve_graphical_environment() {
  if [[ -z "${XDG_RUNTIME_DIR:-}" ]]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  fi

  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -S "${XDG_RUNTIME_DIR}/bus" ]]; then
    export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
  fi

  if [[ -z "${WAYLAND_DISPLAY:-}" ]]; then
    for socket_path in "${XDG_RUNTIME_DIR}"/wayland-*; do
      if [[ -S "${socket_path}" && "${socket_path}" != *.lock ]]; then
        export WAYLAND_DISPLAY="$(basename "${socket_path}")"
        break
      fi
    done
  fi

  if [[ -z "${DISPLAY:-}" ]]; then
    export DISPLAY=":0"
  fi

  export GTK_IM_MODULE="${GTK_IM_MODULE:-fcitx}"
  export QT_IM_MODULE="${QT_IM_MODULE:-fcitx}"
  export XMODIFIERS="${XMODIFIERS:-@im=fcitx}"
}

disable_display_sleep() {
  if ! command -v xset >/dev/null 2>&1; then
    return
  fi

  xset s off >/dev/null 2>&1 || true
  xset s noblank >/dev/null 2>&1 || true
  xset -dpms >/dev/null 2>&1 || true
}

log "launcher start: url=${KIOSK_URL}"
resolve_graphical_environment
disable_display_sleep
trust_desktop_launcher

SESSION_KEY="${XDG_SESSION_ID:-${WAYLAND_DISPLAY:-${DISPLAY:-default}}}"
SESSION_KEY="${SESSION_KEY//[^A-Za-z0-9_.-]/_}"
FIREFOX_PID_FILE="${LOG_DIR}/firefox-${SESSION_KEY}.pid"

if [[ -f "${FIREFOX_PID_FILE}" ]]; then
  firefox_pid="$(cat "${FIREFOX_PID_FILE}")"
  if [[ "${firefox_pid}" =~ ^[0-9]+$ ]] && kill -0 "${firefox_pid}" >/dev/null 2>&1; then
    log "firefox already running for this session; skipping relaunch"
    exit 0
  fi

  rm -f "${FIREFOX_PID_FILE}"
fi

attempt=0
until curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; do
  attempt=$((attempt + 1))

  if [[ "${attempt}" -ge "${WAIT_SECONDS}" ]]; then
    log "server health check timed out after ${WAIT_SECONDS}s: ${HEALTH_URL}"
    exit 1
  fi

  sleep 1
done

sleep "${START_DELAY_SECONDS}"
log "server healthy; launching firefox kiosk"
setsid firefox -kiosk -private-window "${KIOSK_URL}" >> "${LOG_FILE}" 2>&1 &
echo "$!" > "${FIREFOX_PID_FILE}"
log "firefox launch command issued"
