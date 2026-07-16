#!/bin/bash
set -euo pipefail

OS_RELEASE_PATH="${OS_RELEASE_PATH:-/etc/os-release}"
TAILSCALE_KEY_URL="https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg"
TAILSCALE_SOURCE_URL="https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list"
TAILSCALE_KEY_PATH="/usr/share/keyrings/tailscale-archive-keyring.gpg"
TAILSCALE_SOURCE_PATH="/etc/apt/sources.list.d/tailscale.list"

fail() {
  echo "ERROR: $*" >&2
  return 1
}

require_root() {
  [[ "${EUID}" -eq 0 ]] || fail "run as root: sudo ./deploy/install-tailscale.sh"
}

require_supported_host() {
  [[ -r "${OS_RELEASE_PATH}" ]] || fail "OS release file is not readable: ${OS_RELEASE_PATH}"

  local ID="" VERSION_ID="" VERSION_CODENAME=""
  # shellcheck disable=SC1090
  source "${OS_RELEASE_PATH}"
  [[ "${ID}" == "ubuntu" && "${VERSION_ID}" == "24.04" && "${VERSION_CODENAME}" == "noble" ]] \
    || fail "Tailscale prerequisite supports Ubuntu 24.04 Noble only"
}

tailscale_ready() {
  command -v tailscale >/dev/null 2>&1 \
    && tailscale_persistently_enabled \
    && systemctl is-active --quiet tailscaled.service
}

tailscale_persistently_enabled() {
  local enablement
  enablement="$(systemctl is-enabled tailscaled.service 2>/dev/null)" || return 1
  [[ "${enablement}" == "enabled" ]]
}

require_writable_root_for_changes() {
  local root_fstype
  root_fstype="$(findmnt -n -o FSTYPE /)" \
    || fail "cannot determine root filesystem type before Tailscale prerequisite changes"
  [[ -n "${root_fstype}" ]] \
    || fail "cannot determine root filesystem type before Tailscale prerequisite changes"
  [[ "${root_fstype}" != "overlay" ]] \
    || fail "disable readonly root and reboot before installing or enabling Tailscale"
}

enable_tailscale_daemon() {
  systemctl enable --now tailscaled.service \
    || fail "failed to enable and start tailscaled.service"
  tailscale_ready \
    || fail "Tailscale CLI or enabled/active tailscaled.service is unavailable after setup"
}

start_enabled_tailscale_daemon() {
  systemctl start tailscaled.service \
    || fail "failed to start enabled tailscaled.service"
  tailscale_ready \
    || fail "Tailscale CLI or enabled/active tailscaled.service is unavailable after start"
}

install_tailscale_package() (
  local temp_dir key_file source_file
  temp_dir="$(mktemp -d)" || fail "failed to create temporary directory for Tailscale repository files"
  key_file="${temp_dir}/tailscale-archive-keyring.gpg"
  source_file="${temp_dir}/tailscale.list"
  trap 'rm -rf "${temp_dir}"' EXIT

  apt-get update || fail "failed to refresh apt metadata before Tailscale repository setup"
  apt-get install -y curl ca-certificates \
    || fail "failed to install curl and ca-certificates for Tailscale repository setup"

  curl -fsSL "${TAILSCALE_KEY_URL}" -o "${key_file}" \
    || fail "failed to download the official Tailscale Noble keyring"
  [[ -s "${key_file}" ]] || fail "downloaded Tailscale Noble keyring is empty"
  curl -fsSL "${TAILSCALE_SOURCE_URL}" -o "${source_file}" \
    || fail "failed to download the official Tailscale Noble package source"
  [[ -s "${source_file}" ]] || fail "downloaded Tailscale Noble package source is empty"

  install -d -m 0755 /usr/share/keyrings /etc/apt/sources.list.d
  install -m 0644 "${key_file}" "${TAILSCALE_KEY_PATH}"
  install -m 0644 "${source_file}" "${TAILSCALE_SOURCE_PATH}"

  apt-get update || fail "failed to refresh apt metadata after Tailscale repository setup"
  apt-get install -y tailscale || fail "failed to install the tailscale package"
)

main() {
  require_root
  require_supported_host

  if tailscale_ready; then
    echo "OK: Tailscale CLI and tailscaled.service are already ready"
    return 0
  fi

  if command -v tailscale >/dev/null 2>&1 \
    && tailscale_persistently_enabled; then
    start_enabled_tailscale_daemon
    echo "OK: enabled tailscaled.service started"
    return 0
  fi

  require_writable_root_for_changes

  if ! command -v tailscale >/dev/null 2>&1; then
    install_tailscale_package
  fi

  enable_tailscale_daemon
  echo "OK: Tailscale CLI installed; tailscaled.service enabled and active"
  echo "INFO: tailnet enrollment remains an explicit operator step"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
