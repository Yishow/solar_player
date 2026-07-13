#!/bin/bash
# Solar Display — Production Deploy Script
# Usage:
#   bash deploy/deploy.sh                  # install to /data/solar-display
#   bash deploy/deploy.sh /srv/solar-display
#
# Optional test/ops overrides (never required for production):
#   DEPLOY_BUILD_CMD=...   replace `pnpm run build`
#   DEPLOY_PNPM_CMD=...    replace `pnpm install --prod`
#   DEPLOY_SYSTEMD_DIR=... write unit here instead of /etc/systemd/system
#   DEPLOY_SKIP_SYSTEMD=1  render unit under install root only; no daemon-reload/enable
#   DEPLOY_NO_SUDO=1       run without sudo (fixture / temp roots)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CANONICAL_INSTALL_ROOT="/data/solar-display"
INSTALL_DIR="${1:-${CANONICAL_INSTALL_ROOT}}"
SERVICE_TEMPLATE="${SCRIPT_DIR}/solar-display.service"
SYSTEMD_DIR="${DEPLOY_SYSTEMD_DIR:-/etc/systemd/system}"
BUILD_CMD="${DEPLOY_BUILD_CMD:-pnpm run build}"
PNPM_CMD="${DEPLOY_PNPM_CMD:-pnpm install --prod}"

run_priv() {
  if [[ "${DEPLOY_NO_SUDO:-0}" == "1" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# Absolute path only; reject newlines and characters that break sed '#' delimiters.
validate_install_root() {
  local root="$1"
  if [[ -z "${root}" ]]; then
    fail "install root must be a non-empty absolute path"
  fi
  if [[ "${root}" != /* ]]; then
    fail "install root must be an absolute path: ${root}"
  fi
  if [[ "${root}" == *$'\n'* || "${root}" == *$'\r'* ]]; then
    fail "install root must not contain newlines"
  fi
  if [[ "${root}" == *'#'* ]]; then
    fail "install root must not contain '#' (sed delimiter)"
  fi
}

# Render path-sensitive fields from the canonical unit template into DEST.
# On failure the caller must not daemon-reload / enable.
render_service_unit() {
  local root="$1"
  local dest="$2"
  local template="${3:-${SERVICE_TEMPLATE}}"

  [[ -f "${template}" ]] || fail "service template missing: ${template}"

  local tmp
  tmp="$(mktemp)"

  if ! sed \
    -e "s#^WorkingDirectory=.*#WorkingDirectory=${root}#" \
    -e "s#^EnvironmentFile=.*#EnvironmentFile=-${root}/.env#" \
    -e "s#^Environment=DATA_DIR=.*#Environment=DATA_DIR=${root}/data#" \
    -e "s#^Environment=LOG_DIR=.*#Environment=LOG_DIR=${root}/logs#" \
    -e "s#^ReadWritePaths=.*#ReadWritePaths=${root}/data ${root}/logs ${root}/uploads/images ${root}/uploads/brand#" \
    "${template}" > "${tmp}"; then
    rm -f "${tmp}"
    fail "failed to render systemd unit for ${root}"
  fi

  # Sanity: every path-sensitive field must mention the selected root.
  if ! grep -q "^WorkingDirectory=${root}$" "${tmp}" \
    || ! grep -q "^EnvironmentFile=-${root}/.env$" "${tmp}" \
    || ! grep -q "^Environment=DATA_DIR=${root}/data$" "${tmp}" \
    || ! grep -q "^Environment=LOG_DIR=${root}/logs$" "${tmp}" \
    || ! grep -q "^ReadWritePaths=${root}/data ${root}/logs ${root}/uploads/images ${root}/uploads/brand$" "${tmp}"; then
    rm -f "${tmp}"
    fail "rendered unit does not fully resolve paths under ${root}"
  fi

  if ! run_priv install -m 644 "${tmp}" "${dest}"; then
    rm -f "${tmp}"
    fail "failed to install rendered unit to ${dest}"
  fi
  rm -f "${tmp}"
}

# Refresh application bundle only. Never clobber .env / data / logs / uploads.
copy_application_bundle() {
  local dest="$1"
  run_priv mkdir -p \
    "${dest}" \
    "${dest}/data" \
    "${dest}/logs" \
    "${dest}/uploads/images" \
    "${dest}/uploads/brand" \
    "${dest}/deploy"

  # Application trees (overwrite code/assets only).
  run_priv mkdir -p "${dest}/apps" "${dest}/packages"
  run_priv cp -R "${PROJECT_DIR}/apps/." "${dest}/apps/"
  run_priv cp -R "${PROJECT_DIR}/packages/." "${dest}/packages/"
  run_priv cp "${PROJECT_DIR}/package.json" "${dest}/package.json"
  run_priv cp "${PROJECT_DIR}/pnpm-lock.yaml" "${dest}/pnpm-lock.yaml"
  run_priv cp "${PROJECT_DIR}/pnpm-workspace.yaml" "${dest}/pnpm-workspace.yaml"
  run_priv cp "${PROJECT_DIR}/.env.example" "${dest}/.env.example"
  # Keep deploy helpers next to the install so operators can re-verify/kiosk-install.
  if [[ -d "${PROJECT_DIR}/deploy" ]]; then
    run_priv mkdir -p "${dest}/deploy"
    run_priv cp -R "${PROJECT_DIR}/deploy/." "${dest}/deploy/"
  fi
  # Release identity for Device Status (regenerated at deploy time from the source tree).
  if [[ -f "${PROJECT_DIR}/scripts/generate-release-manifest.mjs" ]]; then
    node "${PROJECT_DIR}/scripts/generate-release-manifest.mjs" \
      --project-root "${PROJECT_DIR}" \
      --out "${dest}/release-manifest.json"
  elif [[ -f "${PROJECT_DIR}/release-manifest.json" ]]; then
    run_priv cp "${PROJECT_DIR}/release-manifest.json" "${dest}/release-manifest.json"
  fi
  # Intentionally do NOT copy: .env, data/, logs/, uploads/
}

main() {
  validate_install_root "${INSTALL_DIR}"

  echo "=== Solar Display Deploy ==="
  echo "Installing to: ${INSTALL_DIR}"
  echo "Canonical default root: ${CANONICAL_INSTALL_ROOT}"

  # 1. Production build (skipped/replaced under tests via DEPLOY_BUILD_CMD)
  echo "[1/5] Building frontend..."
  cd "${PROJECT_DIR}"
  # shellcheck disable=SC2086
  eval "${BUILD_CMD}"

  # 2. Create install directory layout (mkdir -p is non-destructive)
  echo "[2/5] Creating install directory..."
  copy_application_bundle "${INSTALL_DIR}"

  # 3. Ownership for dependency install (no-op under DEPLOY_NO_SUDO when already owned)
  echo "[3/5] Preparing ownership..."
  if [[ "${DEPLOY_NO_SUDO:-0}" != "1" ]]; then
    run_priv chown -R "${USER}:${USER}" "${INSTALL_DIR}"
  fi

  # 4. Install production dependencies
  echo "[4/5] Installing dependencies..."
  cd "${INSTALL_DIR}"
  # shellcheck disable=SC2086
  eval "${PNPM_CMD}"

  # 5. Render + install systemd unit for the selected root
  echo "[5/5] Installing systemd service..."
  local unit_dest
  if [[ "${DEPLOY_SKIP_SYSTEMD:-0}" == "1" ]]; then
    unit_dest="${INSTALL_DIR}/deploy/solar-display.service.rendered"
    run_priv mkdir -p "$(dirname "${unit_dest}")"
    # Render without sudo install into install tree
    DEPLOY_NO_SUDO=1 render_service_unit "${INSTALL_DIR}" "${unit_dest}"
    echo "Rendered unit (no systemd mutation): ${unit_dest}"
  else
    unit_dest="${SYSTEMD_DIR}/solar-display.service"
    run_priv mkdir -p "${SYSTEMD_DIR}"
    if ! render_service_unit "${INSTALL_DIR}" "${unit_dest}"; then
      fail "unit render/install failed; skipping daemon-reload/enable"
    fi
    run_priv systemctl daemon-reload
    run_priv systemctl enable solar-display
  fi

  echo ""
  echo "=== Deploy complete! ==="
  echo "Install root: ${INSTALL_DIR}"
  echo "Create env file if needed: cp ${INSTALL_DIR}/.env.example ${INSTALL_DIR}/.env"
  echo "Start the service: sudo systemctl start solar-display"
  echo "Check status:      sudo systemctl status solar-display"
  echo "View logs:         sudo journalctl -u solar-display -f"
  echo "Release identity:  ${INSTALL_DIR}/release-manifest.json"
  echo "Device Status journal reader is installed by deploy/install-kiosk.sh"
  echo ""
  echo "Mutable paths (preserved on update):"
  echo "  ${INSTALL_DIR}/.env"
  echo "  ${INSTALL_DIR}/data"
  echo "  ${INSTALL_DIR}/logs"
  echo "  ${INSTALL_DIR}/uploads"
  echo ""
  echo "For kiosk mode on Raspberry Pi, use deploy/install-kiosk.sh against this install root."
}

# Allow unit tests to source helpers without executing main.
if [[ "${DEPLOY_SOURCE_ONLY:-0}" != "1" ]]; then
  main "$@"
fi
