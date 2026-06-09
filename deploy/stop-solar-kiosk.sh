#!/bin/bash
set -euo pipefail

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/solar-display"
LOG_FILE="${LOG_DIR}/kiosk-launcher.log"

mkdir -p "${LOG_DIR}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" >> "${LOG_FILE}"
}

if pgrep -x firefox >/dev/null 2>&1; then
  log "kiosk exit requested; stopping firefox"
  pkill -x firefox
  exit 0
fi

log "kiosk exit requested; firefox not running"
