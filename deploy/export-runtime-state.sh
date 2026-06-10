#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
OUTPUT_DIR="${EXPORT_OUTPUT_DIR:-${INSTALL_DIR}/exports}"
TIMESTAMP="${EXPORT_TIMESTAMP:-$(date +%Y%m%d-%H%M%S)}"
ARCHIVE_PATH="${OUTPUT_DIR}/solar-display-runtime-${TIMESTAMP}.tar.gz"

mkdir -p "${OUTPUT_DIR}"

entries=()

add_if_exists() {
  local relative_path="$1"

  if [[ -e "${INSTALL_DIR}/${relative_path}" ]]; then
    entries+=("${relative_path}")
  fi
}

add_if_exists "data"
add_if_exists "uploads/images"
add_if_exists "uploads/brand"
add_if_exists ".env"

if [[ "${#entries[@]}" -eq 0 ]]; then
  echo "Nothing to export under ${INSTALL_DIR}" >&2
  exit 1
fi

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet solar-display; then
  echo "Warning: solar-display.service is active. Stop it first for the safest SQLite copy." >&2
fi

tar -czf "${ARCHIVE_PATH}" -C "${INSTALL_DIR}" "${entries[@]}"

echo "Exported runtime state:"
echo "  ${ARCHIVE_PATH}"
echo "Included paths:"
for entry in "${entries[@]}"; do
  echo "  - ${entry}"
done
