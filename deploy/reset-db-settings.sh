#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
DATA_DIR="${DATA_DIR:-${INSTALL_DIR}/data}"
DB_BASENAME="${DB_BASENAME:-solar-display.sqlite}"
DB_PATH="${DATA_DIR}/${DB_BASENAME}"
SERVICE_NAME="${SERVICE_NAME:-solar-display}"
service_was_active=0

stop_service_if_active() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return
  fi

  if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "Stopping ${SERVICE_NAME}.service..."
    systemctl stop "${SERVICE_NAME}"
    service_was_active=1
  fi
}

start_service_if_needed() {
  if [[ "${service_was_active}" -ne 1 ]]; then
    return
  fi

  echo "Starting ${SERVICE_NAME}.service..."
  systemctl start "${SERVICE_NAME}"
  service_was_active=0
}

mkdir -p "${DATA_DIR}"

stop_service_if_active
trap start_service_if_needed EXIT

rm -f "${DB_PATH}" "${DB_PATH}-wal" "${DB_PATH}-shm"

start_service_if_needed
trap - EXIT

echo "Reset DB settings by removing:"
echo "  ${DB_PATH}"
echo "  ${DB_PATH}-wal"
echo "  ${DB_PATH}-shm"
echo "Uploads and .env were left untouched."
