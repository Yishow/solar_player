#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONNECTION_ID=""
SCAN_SSID=""
PRIORITY="100"
HOTSPOT_ROOT="${HOTSPOT_ROOT:-}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --connection-id) CONNECTION_ID="${2:-}"; shift 2 ;;
    --scan-ssid) SCAN_SSID="${2:-}"; shift 2 ;;
    --priority) PRIORITY="${2:-}"; shift 2 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ -n "${CONNECTION_ID}" ]] || fail "--connection-id is required"
[[ -n "${SCAN_SSID}" ]] || fail "--scan-ssid is required"
[[ "${PRIORITY}" =~ ^-?[0-9]+$ ]] || fail "priority must be an integer: ${PRIORITY}"
if [[ -z "${HOTSPOT_ROOT}" && "${EUID}" -ne 0 ]]; then
  fail "hotspot policy configuration must run as root"
fi

for command in nmcli systemctl install; do
  command -v "${command}" >/dev/null 2>&1 || fail "missing command: ${command}"
done

nmcli connection show "${CONNECTION_ID}" >/dev/null 2>&1 \
  || fail "NetworkManager connection not found: ${CONNECTION_ID}"
configured_ssid="$(nmcli -g 802-11-wireless.ssid connection show "${CONNECTION_ID}")"
[[ "${configured_ssid}" == "${SCAN_SSID}" ]] \
  || fail "NetworkManager connection ${CONNECTION_ID} uses SSID ${configured_ssid}, expected ${SCAN_SSID}"

trigger_source="${SCRIPT_DIR}/tailscale-hotspot-trigger.sh"
service_source="${SCRIPT_DIR}/tailscale-hotspot-trigger.service"
timer_source="${SCRIPT_DIR}/tailscale-hotspot-trigger.timer"
[[ -f "${trigger_source}" ]] || fail "missing hotspot trigger: ${trigger_source}"
[[ -f "${service_source}" ]] || fail "missing hotspot service: ${service_source}"
[[ -f "${timer_source}" ]] || fail "missing hotspot timer: ${timer_source}"

sbin_dir="${HOTSPOT_ROOT}/usr/local/sbin"
systemd_dir="${HOTSPOT_ROOT}/etc/systemd/system"
config_dir="${HOTSPOT_ROOT}/etc/solar-display"
install -d -m 755 "${sbin_dir}" "${systemd_dir}" "${config_dir}"

nmcli connection modify "${CONNECTION_ID}" \
  connection.autoconnect yes \
  connection.autoconnect-priority "${PRIORITY}"

install -m 755 "${trigger_source}" "${sbin_dir}/tailscale-hotspot-trigger.sh"
install -m 644 "${service_source}" "${systemd_dir}/tailscale-hotspot-trigger.service"
install -m 644 "${timer_source}" "${systemd_dir}/tailscale-hotspot-trigger.timer"
{
  printf 'HOTSPOT_CONNECTION_ID=%q\n' "${CONNECTION_ID}"
  printf 'HOTSPOT_SCAN_SSID=%q\n' "${SCAN_SSID}"
  printf 'HOTSPOT_PRIORITY=%q\n' "${PRIORITY}"
} > "${config_dir}/tailscale-hotspot-trigger.env"
chmod 600 "${config_dir}/tailscale-hotspot-trigger.env"

systemctl daemon-reload
systemctl enable tailscale-hotspot-trigger.timer

echo "Configured preferred hotspot ${CONNECTION_ID} (SSID ${SCAN_SSID}, priority ${PRIORITY}); timer enabled for next boot"
