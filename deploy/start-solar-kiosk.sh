#!/bin/bash
set -euo pipefail

KIOSK_URL="${KIOSK_URL:-http://127.0.0.1:3000/overview}"
HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/solar-display"
LOG_FILE="${LOG_DIR}/kiosk-launcher.log"
WAIT_SECONDS="${KIOSK_WAIT_SECONDS:-120}"
START_DELAY_SECONDS="${KIOSK_START_DELAY:-5}"
RESTART_DELAY_SECONDS="${KIOSK_RESTART_DELAY:-5}"
DESKTOP_LAUNCHER="${KIOSK_DESKTOP_LAUNCHER:-$HOME/Desktop/Solar Display Kiosk.desktop}"
KIOSK_DISPLAY_OUTPUT="${KIOSK_DISPLAY_OUTPUT:-}"
STOP_REQUEST_FILE="${LOG_DIR}/kiosk-stop-requested"
BROWSER_ACTION_LOCK_FILE="${LOG_DIR}/kiosk-browser-action.lock"
KIOSK_BROWSER_PID_FILE="${LOG_DIR}/kiosk-browser.pid"

mkdir -p "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "${LOG_FILE}"
}

read_process_identity() {
  local process_id="$1"
  local started_at

  started_at="$(ps -o lstart= -p "${process_id}" 2>/dev/null || true)"
  started_at="${started_at#"${started_at%%[![:space:]]*}"}"
  started_at="${started_at%"${started_at##*[![:space:]]}"}"
  [[ -n "${started_at}" ]] || return 1
  printf '%s\n' "${started_at// /_}"
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

lock_fhd_resolution() {
  if ! command -v xrandr >/dev/null 2>&1; then
    return
  fi

  local xrandr_output connected_output current_mode requested_output
  xrandr_output="$(xrandr --query 2>/dev/null || true)"
  requested_output="${KIOSK_DISPLAY_OUTPUT:-}"

  if [[ -n "${requested_output}" ]]; then
    connected_output="${requested_output}"
  else
    connected_output="$(printf '%s\n' "${xrandr_output}" | awk '$2 == "connected" && $3 == "primary" { print $1; exit }')"
    if [[ -z "${connected_output}" ]]; then
      connected_output="$(printf '%s\n' "${xrandr_output}" | awk '$2 == "connected" { print $1; exit }')"
    fi
  fi

  [[ -n "${connected_output}" ]] || return

  if ! printf '%s\n' "${xrandr_output}" | awk -v output="${connected_output}" '
    $1 == output && $2 == "connected" { found = 1; exit }
    END { exit found ? 0 : 1 }
  '; then
    log "display output ${connected_output} is not connected; leaving current mode"
    return
  fi

  xrandr --output "${connected_output}" --primary >/dev/null 2>&1 || true

  if ! printf '%s\n' "${xrandr_output}" | awk -v output="${connected_output}" '
    $1 == output && $2 == "connected" { in_output = 1; next }
    in_output && $1 !~ /^[0-9]/ { exit }
    in_output && $1 == "1920x1080" { found = 1; exit }
    END { exit found ? 0 : 1 }
  '; then
    log "display output ${connected_output} does not advertise 1920x1080; leaving current mode"
    return
  fi

  current_mode="$(printf '%s\n' "${xrandr_output}" | awk -v output="${connected_output}" '
    $1 == output && $2 == "connected" { in_output = 1; next }
    in_output && $1 !~ /^[0-9]/ { exit }
    in_output && $0 ~ /\*/ { print $1; exit }
  ')"

  if [[ "${current_mode}" == "1920x1080" ]]; then
    log "display output ${connected_output} already locked at 1920x1080"
    return
  fi

  if xrandr --output "${connected_output}" --mode 1920x1080 --rate 60 >/dev/null 2>&1 || \
    xrandr --output "${connected_output}" --mode 1920x1080 >/dev/null 2>&1; then
    log "locked ${connected_output} to 1920x1080"
    return
  fi

  log "failed to lock ${connected_output} to 1920x1080"
}

log "launcher start: url=${KIOSK_URL}"
resolve_graphical_environment
lock_fhd_resolution
disable_display_sleep
trust_desktop_launcher

SESSION_KEY="${XDG_SESSION_ID:-${WAYLAND_DISPLAY:-${DISPLAY:-default}}}"
SESSION_KEY="${SESSION_KEY//[^A-Za-z0-9_.-]/_}"
KIOSK_MONITOR_PID_FILE="${LOG_DIR}/firefox-${SESSION_KEY}.pid"
KIOSK_MONITOR_LOCK_FILE="${KIOSK_MONITOR_PID_FILE}.lock"

if ! command -v flock >/dev/null 2>&1; then
  log "flock is required to coordinate the kiosk browser lifecycle"
  exit 1
fi

exec 9> "${KIOSK_MONITOR_LOCK_FILE}"
if ! flock -n 9; then
  log "kiosk already managed for this session; skipping relaunch"
  exit 0
fi

if [[ -f "${KIOSK_MONITOR_PID_FILE}" ]]; then
  monitor_pid="$(cat "${KIOSK_MONITOR_PID_FILE}" 2>/dev/null || true)"
  if [[ "${monitor_pid}" =~ ^[0-9]+$ ]] && kill -0 "${monitor_pid}" >/dev/null 2>&1; then
    log "kiosk already managed for this session; skipping relaunch"
    exit 0
  fi
fi

rm -f "${STOP_REQUEST_FILE}"
printf '%s\n' "$$" > "${KIOSK_MONITOR_PID_FILE}"

cleanup() {
  if [[ "$(cat "${KIOSK_MONITOR_PID_FILE}" 2>/dev/null || true)" == "$$" ]]; then
    rm -f "${KIOSK_MONITOR_PID_FILE}"
  fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM HUP
exec 8> "${BROWSER_ACTION_LOCK_FILE}"

wait_for_server() {
  local attempt=0

  until curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [[ "${attempt}" -ge "${WAIT_SECONDS}" ]]; then
      log "server health check timed out after ${WAIT_SECONDS}s: ${HEALTH_URL}"
      return 1
    fi

    sleep 1
  done
}

while true; do
  if ! wait_for_server; then
    if [[ -f "${STOP_REQUEST_FILE}" ]]; then
      log "kiosk stop requested while waiting for server; monitor exiting"
      exit 0
    fi

    sleep "${RESTART_DELAY_SECONDS}"
    continue
  fi

  if [[ -f "${STOP_REQUEST_FILE}" ]]; then
    log "kiosk stop requested before browser launch; monitor exiting"
    exit 0
  fi

  sleep "${START_DELAY_SECONDS}"
  if [[ -f "${STOP_REQUEST_FILE}" ]]; then
    log "kiosk stop requested during start delay; monitor exiting"
    exit 0
  fi

  flock 8
  if [[ -f "${STOP_REQUEST_FILE}" ]]; then
    flock -u 8
    log "kiosk stop requested before browser launch; monitor exiting"
    exit 0
  fi

  log "server healthy; launching firefox kiosk"
  setsid firefox -kiosk -private-window "${KIOSK_URL}" >> "${LOG_FILE}" 2>&1 8>&- 9>&- &
  firefox_pid="$!"
  if ! firefox_identity="$(read_process_identity "${firefox_pid}")"; then
    log "failed to identify firefox process; terminating untracked launch"
    kill "${firefox_pid}" >/dev/null 2>&1 || true
    flock -u 8
    wait "${firefox_pid}" 2>/dev/null || true
    sleep "${RESTART_DELAY_SECONDS}"
    continue
  fi
  printf '%s %s\n' "${firefox_pid}" "${firefox_identity}" > "${KIOSK_BROWSER_PID_FILE}"
  flock -u 8
  log "firefox launch command issued"

  if wait "${firefox_pid}"; then
    firefox_status=0
  else
    firefox_status="$?"
  fi

  if [[ "$(cat "${KIOSK_BROWSER_PID_FILE}" 2>/dev/null || true)" == "${firefox_pid} ${firefox_identity}" ]]; then
    rm -f "${KIOSK_BROWSER_PID_FILE}"
  fi

  if [[ -f "${STOP_REQUEST_FILE}" ]]; then
    log "kiosk stop requested; monitor exiting"
    exit 0
  fi

  log "firefox exited unexpectedly with status ${firefox_status}; restarting after ${RESTART_DELAY_SECONDS}s"
  sleep "${RESTART_DELAY_SECONDS}"
done
