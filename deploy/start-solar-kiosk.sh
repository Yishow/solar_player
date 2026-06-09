#!/bin/bash
set -euo pipefail

KIOSK_URL="${KIOSK_URL:-http://127.0.0.1:3000/overview}"
HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/solar-display"
LOG_FILE="${LOG_DIR}/kiosk-launcher.log"
WAIT_SECONDS="${KIOSK_WAIT_SECONDS:-120}"

mkdir -p "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "${LOG_FILE}"
}

log "launcher start: url=${KIOSK_URL}"

if pgrep -x firefox >/dev/null 2>&1; then
  log "firefox already running; skipping relaunch"
  exit 0
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

log "server healthy; launching firefox kiosk"
setsid firefox -kiosk -private-window "${KIOSK_URL}" >> "${LOG_FILE}" 2>&1 &
log "firefox launch command issued"
