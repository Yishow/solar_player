#!/bin/bash
set -euo pipefail

HOTSPOT_CONNECTION_ID="${HOTSPOT_CONNECTION_ID:-}"
HOTSPOT_SCAN_SSID="${HOTSPOT_SCAN_SSID:-${HOTSPOT_CONNECTION_ID}}"
BLUETOOTH_TRIGGER_MAC="${BLUETOOTH_TRIGGER_MAC:-}"
TAILSCALE_TIMEOUT_SECONDS="${TAILSCALE_TIMEOUT_SECONDS:-60}"

log() {
  echo "tailscale-hotspot-trigger: $*"
}

fail() {
  echo "tailscale-hotspot-trigger: ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

bluetooth_connected() {
  [[ -n "${BLUETOOTH_TRIGGER_MAC}" ]] || return 1
  command -v bluetoothctl >/dev/null 2>&1 || return 1

  bluetoothctl info "${BLUETOOTH_TRIGGER_MAC}" 2>/dev/null | grep -q 'Connected: yes'
}

hotspot_visible() {
  [[ -n "${HOTSPOT_SCAN_SSID}" ]] || return 1

  nmcli -t -f SSID dev wifi list --rescan yes 2>/dev/null |
    sed 's/\\:/:/g' |
    grep -Fxq -- "${HOTSPOT_SCAN_SSID}"
}

active_hotspot_connected() {
  nmcli -t -f NAME con show --active 2>/dev/null |
    sed 's/\\:/:/g' |
    grep -Fxq -- "${HOTSPOT_CONNECTION_ID}"
}

tailscale_has_ip() {
  command -v tailscale >/dev/null 2>&1 || return 1
  tailscale ip -4 >/dev/null 2>&1
}

wait_for_tailscale_ip() {
  local deadline
  deadline=$((SECONDS + TAILSCALE_TIMEOUT_SECONDS))

  while (( SECONDS <= deadline )); do
    tailscale_has_ip && return 0
    sleep 2
  done

  return 1
}

main() {
  require_command nmcli

  [[ -n "${HOTSPOT_CONNECTION_ID}" ]] || fail "HOTSPOT_CONNECTION_ID is required"

  if active_hotspot_connected && tailscale_has_ip; then
    log "already connected to ${HOTSPOT_CONNECTION_ID}; tailscale has IPv4: $(tailscale ip -4)"
    return 0
  fi

  if ! bluetooth_connected && ! hotspot_visible; then
    log "no trigger matched; leaving current Wi-Fi unchanged"
    return 0
  fi

  log "trigger matched; bringing up hotspot connection: ${HOTSPOT_CONNECTION_ID}"
  nmcli con up id "${HOTSPOT_CONNECTION_ID}"

  if wait_for_tailscale_ip; then
    log "tailscale has IPv4: $(tailscale ip -4)"
    return 0
  fi

  log "hotspot connection attempted, but tailscale IPv4 was not ready within ${TAILSCALE_TIMEOUT_SECONDS}s"
  return 1
}

main "$@"
