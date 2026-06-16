#!/bin/bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
HELPER="${INSTALL_DIR}/deploy/enable-readonly-root.sh"
KIOSK_USER="${KIOSK_USER:-$(id -un)}"

echo "Enable Read Only System"
echo "This will validate the kiosk runtime, enable overlayroot, and require reboot."

if [[ ! -x "${HELPER}" ]]; then
  echo "ERROR: readonly helper not found: ${HELPER}" >&2
  exit 1
fi

sudo env APPLY_READONLY_ROOT=1 INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${HELPER}"
echo ""
echo "Readonly system has been configured. Reboot is required."
read -r -p "Press Enter to close..."
