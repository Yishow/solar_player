#!/bin/bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
KIOSK_USER="${KIOSK_USER:-pi}"
APPLY_READONLY_ROOT="${APPLY_READONLY_ROOT:-0}"
OVERLAYROOT_MODE="${OVERLAYROOT_MODE:-tmpfs:recurse=0}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

check_runtime_writes() {
  [[ -d "${INSTALL_DIR}" ]] || fail "Runtime install directory is missing: ${INSTALL_DIR}"
  [[ "${INSTALL_DIR}" == /data/solar-display* ]] || fail "INSTALL_DIR must be under /data/solar-display: ${INSTALL_DIR}"

  for path in \
    "${INSTALL_DIR}/data" \
    "${INSTALL_DIR}/logs" \
    "${INSTALL_DIR}/uploads/images" \
    "${INSTALL_DIR}/uploads/brand"; do
    [[ -d "${path}" ]] || fail "Required runtime directory is missing: ${path}"
    sudo -u "${KIOSK_USER}" test -w "${path}" || fail "Runtime directory is not writable by ${KIOSK_USER}: ${path}"
  done
}

print_next_steps() {
  cat <<EOF
Runtime write validation passed for ${INSTALL_DIR}.

After enabling read-only root hardening:
1. sudo reboot
2. sudo ${INSTALL_DIR}/deploy/verify-kiosk-install.sh
3. Exit kiosk from Device Status and use the desktop launcher: Solar Display Kiosk

This script keeps application writes under:
- ${INSTALL_DIR}/data
- ${INSTALL_DIR}/logs
- ${INSTALL_DIR}/uploads/images
- ${INSTALL_DIR}/uploads/brand
EOF
}

check_runtime_writes
print_next_steps

if [[ "${APPLY_READONLY_ROOT}" != "1" ]]; then
  echo "Dry run only. Re-run with APPLY_READONLY_ROOT=1 to apply host-specific read-only root hardening."
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  fail "APPLY_READONLY_ROOT=1 must be run as root"
fi

if ! command -v update-initramfs >/dev/null 2>&1 || ! command -v overlayroot-chroot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y overlayroot
fi

if [[ -f /etc/overlayroot.local.conf ]]; then
  cp /etc/overlayroot.local.conf "/etc/overlayroot.local.conf.solar-display-backup-$(date +%Y%m%d%H%M%S)"
fi

printf 'overlayroot="%s"\n' "${OVERLAYROOT_MODE}" > /etc/overlayroot.local.conf
update-initramfs -u

echo "Applied overlayroot mode: ${OVERLAYROOT_MODE}"
echo "Reboot, then rerun ${INSTALL_DIR}/deploy/verify-kiosk-install.sh."
