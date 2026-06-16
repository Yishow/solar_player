#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
DIST_ROOT="${PROJECT_DIR}/dist/deploy-bundles"
ONLINE_ROOT="${DIST_ROOT}/online"
OFFLINE_ROOT="${DIST_ROOT}/offline"
BUILD_CMD="${DEPLOY_BUILD_CMD:-pnpm run build}"
CHOICE="${DEPLOY_CHOICE:-}"

print_menu() {
  echo "Solar Display deploy bundle"
  echo "1. Build online deploy bundle"
  echo "2. Build offline deploy bundle"
}

prompt_choice() {
  print_menu
  printf "Select [1-2]: "
  read -r CHOICE
}

require_path() {
  local relative_path="$1"

  if [[ ! -e "${PROJECT_DIR}/${relative_path}" ]]; then
    echo "Missing required path: ${relative_path}" >&2
    exit 1
  fi
}

copy_required_tree() {
  local target_root="$1"

  mkdir -p "${target_root}"

  cp -R "${PROJECT_DIR}/apps" "${target_root}/"
  cp -R "${PROJECT_DIR}/packages" "${target_root}/"
  mkdir -p "${target_root}/docs"
  cp "${PROJECT_DIR}/docs/openapi.yaml" "${target_root}/docs/openapi.yaml"
  mkdir -p "${target_root}/docs/reference/kuozui-green-fhd-html-prototype"
  cp -R \
    "${PROJECT_DIR}/docs/reference/kuozui-green-fhd-html-prototype/assets" \
    "${target_root}/docs/reference/kuozui-green-fhd-html-prototype/assets"
  mkdir -p "${target_root}/deploy"
  cp "${PROJECT_DIR}/deploy/solar-display.service" "${target_root}/deploy/solar-display.service"
  cp "${PROJECT_DIR}/deploy/export-runtime-state.sh" "${target_root}/deploy/export-runtime-state.sh"
  cp "${PROJECT_DIR}/deploy/reset-db-settings.sh" "${target_root}/deploy/reset-db-settings.sh"
  cp "${PROJECT_DIR}/deploy/enable-readonly-root.sh" "${target_root}/deploy/enable-readonly-root.sh"
  cp "${PROJECT_DIR}/deploy/raspi-bootstrap.sh" "${target_root}/deploy/raspi-bootstrap.sh"
  cp "${PROJECT_DIR}/deploy/configure-lightweight-desktop.sh" "${target_root}/deploy/configure-lightweight-desktop.sh"
  cp "${PROJECT_DIR}/deploy/readonly-system-enable.sh" "${target_root}/deploy/readonly-system-enable.sh"
  cp "${PROJECT_DIR}/deploy/readonly-system-disable.sh" "${target_root}/deploy/readonly-system-disable.sh"
  cp "${PROJECT_DIR}/deploy/install-kiosk.sh" "${target_root}/deploy/install-kiosk.sh"
  cp "${PROJECT_DIR}/deploy/start-solar-kiosk.sh" "${target_root}/deploy/start-solar-kiosk.sh"
  cp "${PROJECT_DIR}/deploy/stop-solar-kiosk.sh" "${target_root}/deploy/stop-solar-kiosk.sh"
  cp "${PROJECT_DIR}/deploy/verify-kiosk-install.sh" "${target_root}/deploy/verify-kiosk-install.sh"
  cp "${PROJECT_DIR}/deploy/firefox-kiosk.desktop" "${target_root}/deploy/firefox-kiosk.desktop"
  cp "${PROJECT_DIR}/deploy/enable-readonly-system.desktop" "${target_root}/deploy/enable-readonly-system.desktop"
  cp "${PROJECT_DIR}/deploy/disable-readonly-system.desktop" "${target_root}/deploy/disable-readonly-system.desktop"
  mkdir -p "${target_root}/scripts"
  cp "${PROJECT_DIR}/scripts/raspi-onekey-deploy.sh" "${target_root}/scripts/raspi-onekey-deploy.sh"
  cp "${PROJECT_DIR}/scripts/prepare-raspi-user-data.sh" "${target_root}/scripts/prepare-raspi-user-data.sh"
  cp "${PROJECT_DIR}/scripts/prepare-raspi-user-data.ps1" "${target_root}/scripts/prepare-raspi-user-data.ps1"
  chmod +x \
    "${target_root}/deploy/export-runtime-state.sh" \
    "${target_root}/deploy/reset-db-settings.sh" \
    "${target_root}/deploy/enable-readonly-root.sh" \
    "${target_root}/deploy/raspi-bootstrap.sh" \
    "${target_root}/deploy/configure-lightweight-desktop.sh" \
    "${target_root}/deploy/readonly-system-enable.sh" \
    "${target_root}/deploy/readonly-system-disable.sh" \
    "${target_root}/deploy/install-kiosk.sh" \
    "${target_root}/deploy/start-solar-kiosk.sh" \
    "${target_root}/deploy/stop-solar-kiosk.sh" \
    "${target_root}/deploy/verify-kiosk-install.sh" \
    "${target_root}/scripts/raspi-onekey-deploy.sh" \
    "${target_root}/scripts/prepare-raspi-user-data.sh"
  cp "${PROJECT_DIR}/package.json" "${target_root}/package.json"
  cp "${PROJECT_DIR}/pnpm-lock.yaml" "${target_root}/pnpm-lock.yaml"
  cp "${PROJECT_DIR}/pnpm-workspace.yaml" "${target_root}/pnpm-workspace.yaml"
  cp "${PROJECT_DIR}/.env.example" "${target_root}/.env.example"
}

prune_sources_for_bundle() {
  local target_root="$1"

  find "${target_root}/apps/server" -mindepth 1 -maxdepth 1 ! -name dist ! -name src ! -name package.json -exec rm -rf {} +
  find "${target_root}/apps/server/src" -mindepth 1 -maxdepth 1 ! -name db -exec rm -rf {} +
  find "${target_root}/apps/server/src/db" -mindepth 1 -maxdepth 1 ! -name migrations -exec rm -rf {} +
  find "${target_root}/apps/web" -mindepth 1 -maxdepth 1 ! -name dist ! -name src ! -name package.json -exec rm -rf {} +
  find "${target_root}/apps/web/src" -mindepth 1 -maxdepth 1 ! -name assets -exec rm -rf {} +
  find "${target_root}/apps/web/src/assets" -mindepth 1 -maxdepth 1 ! -name playback -exec rm -rf {} +
  find "${target_root}/packages/shared" -mindepth 1 -maxdepth 1 ! -name dist ! -name package.json -exec rm -rf {} +
}

remove_bundle_noise() {
  local target_root="$1"

  find "${target_root}" -name ".DS_Store" -delete
  find "${target_root}" -type f \
    \( -name "*.test.js" -o -name "*.test.js.map" -o -name "*.test.d.ts" -o -name "*.test.d.ts.map" \) \
    -delete
}

write_bundle_readme() {
  local target_root="$1"
  local mode="$2"
  local install_step

  if [[ "${mode}" == "online" ]]; then
    install_step="Run ./install.sh on the target machine. It will install production dependencies with pnpm."
  else
    install_step="Run ./install.sh on the target machine. It reuses the bundled node_modules and does not install from the network."
  fi

  cat > "${target_root}/README.deploy.txt" <<EOF
Solar Display ${mode} deploy bundle

1. Copy this directory to the target machine.
2. Copy .env.example to .env and adjust values if needed.
3. ${install_step}
4. On Ubuntu 24.04 kiosk devices, run sudo ./deploy/install-kiosk.sh to enable server autostart, kz autologin, and Firefox kiosk launch.
5. To move live settings/content to another machine, run ./deploy/export-runtime-state.sh and copy the generated tarball.
6. Reset DB settings only: ./deploy/reset-db-settings.sh
7. Verify kiosk install: sudo ./deploy/verify-kiosk-install.sh
8. After verification, dry-run read-only root hardening: sudo ./deploy/enable-readonly-root.sh
9. Reusable Raspberry Pi deployment entry: ./scripts/raspi-onekey-deploy.sh kz@<pi-ip>
10. Prepare Raspberry Pi system-boot user-data before first boot:
    ./scripts/prepare-raspi-user-data.sh --boot-path /Volumes/system-boot

Notes:
- Offline bundles must be deployed to a machine with the same OS/CPU family used to build this bundle.
- The systemd template stays at deploy/solar-display.service.
- Kiosk launcher logs go to /home/kz/.local/state/solar-display/kiosk-launcher.log by default.
EOF
}

write_install_script() {
  local target_root="$1"
  local mode="$2"
  local install_deps_line

  if [[ "${mode}" == "online" ]]; then
    install_deps_line='pnpm install --prod --frozen-lockfile'
  else
    install_deps_line='echo "Using bundled node_modules; skipping pnpm install."'
  fi

  cat > "${target_root}/install.sh" <<EOF
#!/bin/bash
set -euo pipefail

BUNDLE_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
NVM_DIR="\${NVM_DIR:-\${HOME}/.nvm}"

source_nvm() {
  if [[ -s "\${NVM_DIR}/nvm.sh" ]]; then
    . "\${NVM_DIR}/nvm.sh"
  fi
}

mkdir -p "\${BUNDLE_DIR}/data" "\${BUNDLE_DIR}/logs" "\${BUNDLE_DIR}/uploads/images" "\${BUNDLE_DIR}/uploads/brand"

if [[ ! -f "\${BUNDLE_DIR}/.env" ]]; then
  cp "\${BUNDLE_DIR}/.env.example" "\${BUNDLE_DIR}/.env"
  echo "Created .env from .env.example"
fi

cd "\${BUNDLE_DIR}"
source_nvm
${install_deps_line}

echo ""
echo "Bundle is ready."
echo "Start locally: pnpm --filter @solar-display/server start"
echo "Systemd template: deploy/solar-display.service"
echo "Ubuntu kiosk setup: sudo ./deploy/install-kiosk.sh"
echo "Export current runtime data: ./deploy/export-runtime-state.sh"
echo "Remember to update WorkingDirectory/User in the service file if your install path differs."
EOF

  chmod +x "${target_root}/install.sh"
}

build_bundle() {
  local mode="$1"
  local target_root="$2"

  rm -rf "${target_root}"
  copy_required_tree "${target_root}"
  prune_sources_for_bundle "${target_root}"
  write_bundle_readme "${target_root}" "${mode}"
  write_install_script "${target_root}" "${mode}"

  if [[ "${mode}" == "offline" ]]; then
    cp -R "${PROJECT_DIR}/node_modules" "${target_root}/node_modules"
  fi

  remove_bundle_noise "${target_root}"
}

validate_inputs() {
  require_path "apps/server/dist"
  require_path "apps/web/dist"
  require_path "packages/shared/dist"
  require_path "apps/server/src/db/migrations"
  require_path "docs/openapi.yaml"
  require_path "deploy/solar-display.service"
  require_path "deploy/export-runtime-state.sh"
  require_path "deploy/reset-db-settings.sh"
  require_path "deploy/enable-readonly-root.sh"
  require_path "deploy/raspi-bootstrap.sh"
  require_path "deploy/configure-lightweight-desktop.sh"
  require_path "deploy/readonly-system-enable.sh"
  require_path "deploy/readonly-system-disable.sh"
  require_path "deploy/install-kiosk.sh"
  require_path "deploy/start-solar-kiosk.sh"
  require_path "deploy/stop-solar-kiosk.sh"
  require_path "deploy/verify-kiosk-install.sh"
  require_path "deploy/firefox-kiosk.desktop"
  require_path "deploy/enable-readonly-system.desktop"
  require_path "deploy/disable-readonly-system.desktop"
  require_path "scripts/raspi-onekey-deploy.sh"
  require_path "scripts/prepare-raspi-user-data.sh"
  require_path "scripts/prepare-raspi-user-data.ps1"
  require_path "package.json"
  require_path "pnpm-lock.yaml"
  require_path "pnpm-workspace.yaml"
  require_path ".env.example"
}

main() {
  if [[ -z "${CHOICE}" ]]; then
    prompt_choice
  fi

  case "${CHOICE}" in
    1|online)
      echo "[1/3] Building project..."
      (
        cd "${PROJECT_DIR}"
        eval "${BUILD_CMD}"
      )
      echo "[2/3] Validating runtime files..."
      validate_inputs
      echo "[3/3] Creating online bundle..."
      mkdir -p "${DIST_ROOT}"
      build_bundle "online" "${ONLINE_ROOT}"
      echo "Done: ${ONLINE_ROOT}"
      ;;
    2|offline)
      echo "[1/3] Building project..."
      (
        cd "${PROJECT_DIR}"
        eval "${BUILD_CMD}"
      )
      echo "[2/3] Validating runtime files..."
      validate_inputs
      require_path "node_modules"
      echo "[3/3] Creating offline bundle..."
      mkdir -p "${DIST_ROOT}"
      build_bundle "offline" "${OFFLINE_ROOT}"
      echo "Done: ${OFFLINE_ROOT}"
      ;;
    *)
      echo "Invalid selection: ${CHOICE}" >&2
      print_menu >&2
      exit 1
      ;;
  esac
}

main "$@"
