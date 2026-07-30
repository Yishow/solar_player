#!/bin/bash
set -euo pipefail

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/solar-display"
LOG_FILE="${LOG_DIR}/kiosk-launcher.log"
STOP_REQUEST_FILE="${LOG_DIR}/kiosk-stop-requested"
BROWSER_ACTION_LOCK_FILE="${LOG_DIR}/kiosk-browser-action.lock"
KIOSK_BROWSER_PID_FILE="${LOG_DIR}/kiosk-browser.pid"

mkdir -p "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" >> "${LOG_FILE}"
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

if ! command -v flock >/dev/null 2>&1; then
  log "flock is required to coordinate the kiosk browser lifecycle"
  exit 1
fi

exec 8> "${BROWSER_ACTION_LOCK_FILE}"
flock 8
: > "${STOP_REQUEST_FILE}"

browser_pid=""
browser_identity=""
read -r browser_pid browser_identity < "${KIOSK_BROWSER_PID_FILE}" 2>/dev/null || true
if [[ "${browser_pid}" =~ ^[0-9]+$ ]] && [[ -n "${browser_identity}" ]] && \
  kill -0 "${browser_pid}" >/dev/null 2>&1; then
  current_browser_identity="$(read_process_identity "${browser_pid}" || true)"
  if [[ "${current_browser_identity}" == "${browser_identity}" ]]; then
    log "kiosk exit requested; stopping tracked browser"
    if ! kill "${browser_pid}" 2>/dev/null && kill -0 "${browser_pid}" >/dev/null 2>&1; then
      log "kiosk exit failed; tracked browser is still running"
      flock -u 8
      exit 1
    fi
    rm -f "${KIOSK_BROWSER_PID_FILE}"
    flock -u 8
    exit 0
  fi
fi
rm -f "${KIOSK_BROWSER_PID_FILE}"

if pgrep -x firefox >/dev/null 2>&1; then
  log "kiosk exit requested; stopping firefox"
  pkill -x firefox
  flock -u 8
  exit 0
fi

log "kiosk exit requested; firefox not running"
flock -u 8
