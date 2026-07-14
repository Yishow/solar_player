#!/bin/bash
set -euo pipefail

MODE="update"
INSTALL_DIR="/data/solar-display"
MQTT_HOST="192.168.31.62"
BUNDLE_DIR=""
DESKTOP="xfce-xrdp"
RDP_AUTH="passwordless"
RDP_PASSWORD="${RDP_PASSWORD:-}"
DRY_RUN=0
SKIP_DISK=0
APPLY_READONLY=0
CREATE_DATA_PARTITION=0
ROOT_SIZE_GB=""
DATA_SIZE_GB="10"
SKIP_HOST_PREFLIGHT=0
DISK_FIXTURE=""
CONFIGURE_ENV_ONLY=0
KIOSK_USER="${KIOSK_USER:-pi}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

ok() {
  echo "OK: $*"
}

SERVICE_WAS_ACTIVE=0
BACKUP_DIR=""
PRIOR_APP_ARCHIVE=""
RUNTIME_ARCHIVE=""
RESTORE_HELPER=""

remember_recovery_paths() {
  if [[ -n "${BACKUP_DIR}" && -d "${BACKUP_DIR}" ]]; then
    RUNTIME_ARCHIVE="${BACKUP_DIR}/runtime.tar.gz"
    PRIOR_APP_ARCHIVE="${BACKUP_DIR}/prior-application.tar.gz"
    if [[ -x "${INSTALL_DIR}/deploy/restore-runtime-state.sh" ]]; then
      RESTORE_HELPER="${INSTALL_DIR}/deploy/restore-runtime-state.sh"
    elif [[ -n "${BUNDLE_DIR}" && -x "${BUNDLE_DIR}/deploy/restore-runtime-state.sh" ]]; then
      RESTORE_HELPER="${BUNDLE_DIR}/deploy/restore-runtime-state.sh"
    else
      RESTORE_HELPER="${INSTALL_DIR}/deploy/restore-runtime-state.sh"
    fi
  fi
}

print_recovery_handoff() {
  remember_recovery_paths
  echo "=== Recovery handoff (no automatic production DB rollback) ==="
  if [[ -n "${BACKUP_DIR}" ]]; then
    echo "Verified runtime backup: ${BACKUP_DIR}"
  else
    echo "Verified runtime backup: (not available)"
  fi
  if [[ -n "${PRIOR_APP_ARCHIVE}" ]]; then
    echo "Prior application archive: ${PRIOR_APP_ARCHIVE}"
  fi
  if [[ -n "${RUNTIME_ARCHIVE}" ]]; then
    echo "Runtime archive: ${RUNTIME_ARCHIVE}"
  fi
  echo "Restore is explicit and temp-first. Production DB is NOT automatically restored."
  if [[ -n "${RESTORE_HELPER}" && -n "${BACKUP_DIR}" ]]; then
    echo "Temp restore drill:"
    echo "  ${RESTORE_HELPER} --backup-dir ${BACKUP_DIR} --drill"
    echo "Explicit production overwrite (only after operator decision):"
    echo "  ${RESTORE_HELPER} --backup-dir ${BACKUP_DIR} --target-root ${INSTALL_DIR} --confirm RESTORE-OVERWRITE"
  fi
  echo "Recommended order: restore prior application first, then evaluate whether explicit runtime restore is required."
}

stop_solar_display_if_active() {
  SERVICE_WAS_ACTIVE=0
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi
  if systemctl is-active --quiet solar-display 2>/dev/null; then
    SERVICE_WAS_ACTIVE=1
    systemctl stop solar-display || fail "failed to stop solar-display.service before backup"
    ok "stopped solar-display.service for verified backup"
  else
    ok "solar-display.service is inactive"
  fi
}

start_solar_display_if_was_active() {
  if [[ "${SERVICE_WAS_ACTIVE}" != "1" ]]; then
    return 0
  fi
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi
  systemctl start solar-display || echo "WARNING: failed to restart solar-display.service after backup failure" >&2
  ok "restored previous solar-display.service active state"
}

estimate_backup_bytes() {
  local total=0
  local path_name size
  for path_name in data uploads .env apps packages deploy package.json pnpm-lock.yaml pnpm-workspace.yaml; do
    if [[ -e "${INSTALL_DIR}/${path_name}" ]]; then
      size="$(du -sk "${INSTALL_DIR}/${path_name}" 2>/dev/null | awk '{print $1}')"
      total=$((total + ${size:-0}))
    fi
  done
  # du -sk is KiB; convert to bytes approx and add 20% margin.
  echo $(( total * 1024 * 12 / 10 ))
}

preflight_backup_disk_space() {
  local need available parent
  parent="$(dirname "${INSTALL_DIR}")"
  [[ -d "${INSTALL_DIR}/backups" ]] && parent="${INSTALL_DIR}/backups"
  mkdir -p "${INSTALL_DIR}/backups" 2>/dev/null || true
  need="$(estimate_backup_bytes)"
  command -v df >/dev/null 2>&1 \
    || fail "df is required for backup disk-space preflight but is unavailable (refusing to proceed without a space check)"
  available="$(df -Pk "${INSTALL_DIR}" 2>/dev/null | awk 'NR==2 {print $4}')"
  available=$(( ${available:-0} * 1024 ))
  if (( available <= 0 )); then
    fail "disk space preflight could not determine available space for ${INSTALL_DIR} (df returned no data; refusing to proceed)"
  fi
  if (( need > available )); then
    fail "insufficient disk space for runtime backup (need ~${need} bytes, available ${available})"
  fi
  ok "disk space preflight for backup passed"
}

create_verified_runtime_backup() {
  # Only update mode with an existing install performs the backup gate.
  if [[ "${MODE}" != "update" ]]; then
    ok "init mode skips runtime backup gate"
    return 0
  fi

  if [[ ! -d "${INSTALL_DIR}" ]]; then
    fail "update mode requires an existing install root at ${INSTALL_DIR}"
  fi

  # Skip gate only when install has no mutable state and no application tree yet.
  if [[ ! -e "${INSTALL_DIR}/data" && ! -e "${INSTALL_DIR}/.env" && ! -e "${INSTALL_DIR}/apps" && ! -e "${INSTALL_DIR}/package.json" ]]; then
    ok "update install root is empty; backup gate skipped"
    return 0
  fi

  [[ -n "${BUNDLE_DIR}" ]] || fail "--bundle-dir is required for update backup gate"
  local export_helper="${BUNDLE_DIR}/deploy/export-runtime-state.sh"
  [[ -f "${export_helper}" ]] || fail "export helper missing in staged bundle: ${export_helper}"

  preflight_backup_disk_space
  stop_solar_display_if_active

  local export_log
  export_log="$(mktemp)"
  set +e
  INSTALL_DIR="${INSTALL_DIR}" bash "${export_helper}" >"${export_log}" 2>&1
  local export_status=$?
  set -e
  cat "${export_log}"

  if [[ "${export_status}" -ne 0 ]]; then
    start_solar_display_if_was_active
    rm -f "${export_log}"
    fail "verified runtime backup failed; application files were not replaced"
  fi

  BACKUP_DIR="$(awk -F= '/^BACKUP_DIR=/{print $2; exit}' "${export_log}")"
  rm -f "${export_log}"
  [[ -n "${BACKUP_DIR}" && -d "${BACKUP_DIR}" ]] || fail "export did not report a valid BACKUP_DIR"
  [[ -f "${BACKUP_DIR}/runtime.tar.gz" ]] || fail "runtime archive missing after export"
  [[ -f "${BACKUP_DIR}/runtime.tar.gz.sha256" ]] || fail "runtime archive sidecar missing after export"
  [[ -f "${BACKUP_DIR}/manifest.json" ]] || fail "manifest missing after export"
  [[ -f "${BACKUP_DIR}/prior-application.tar.gz" ]] || fail "prior application archive missing after export"

  remember_recovery_paths
  ok "verified runtime backup ready at ${BACKUP_DIR}"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --install-dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --mqtt-host) MQTT_HOST="${2:-}"; shift 2 ;;
    --bundle-dir) BUNDLE_DIR="${2:-}"; shift 2 ;;
    --desktop) DESKTOP="${2:-}"; shift 2 ;;
    --rdp-auth) RDP_AUTH="${2:-}"; shift 2 ;;
    --rdp-password) RDP_PASSWORD="${2:-}"; shift 2 ;;
    --kiosk-user) KIOSK_USER="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-disk) SKIP_DISK=1; shift ;;
    --apply-readonly) APPLY_READONLY=1; shift ;;
    --create-data-partition) CREATE_DATA_PARTITION=1; shift ;;
    --root-size-gb) ROOT_SIZE_GB="${2:-}"; shift 2 ;;
    --data-size-gb) DATA_SIZE_GB="${2:-}"; shift 2 ;;
    --skip-host-preflight) SKIP_HOST_PREFLIGHT=1; shift ;;
    --disk-fixture) DISK_FIXTURE="${2:-}"; shift 2 ;;
    --configure-env-only) CONFIGURE_ENV_ONLY=1; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ "${MODE}" == "init" || "${MODE}" == "update" ]] || fail "--mode must be init or update"
[[ "${DESKTOP}" == "xfce-xrdp" || "${DESKTOP}" == "none" ]] || fail "--desktop must be xfce-xrdp or none"
[[ "${RDP_AUTH}" == "passwordless" || "${RDP_AUTH}" == "system-password" ]] || fail "--rdp-auth must be passwordless or system-password"

check_host() {
  [[ "${SKIP_HOST_PREFLIGHT}" == "1" ]] && return 0
  [[ "${DRY_RUN}" == "1" && -n "${DISK_FIXTURE}" ]] && return 0
  [[ "${EUID}" -eq 0 ]] || fail "bootstrap must run as root"
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]] || fail "Unsupported OS: ${PRETTY_NAME:-unknown}"
  [[ "$(uname -m)" == "aarch64" ]] || fail "Unsupported architecture: $(uname -m)"
  id "${KIOSK_USER}" >/dev/null 2>&1 || fail "User not found: ${KIOSK_USER}"
  ok "supported Ubuntu 24.04 arm64 host"
}

check_disk_layout() {
  if [[ "${SKIP_DISK}" == "1" ]]; then
    [[ "${DRY_RUN}" == "1" || "${SKIP_HOST_PREFLIGHT}" == "1" ]] || findmnt /data >/dev/null 2>&1 || fail "/data runtime mount is missing and --skip-disk was requested"
    ok "disk setup skipped"
    return 0
  fi

  if [[ "${DISK_FIXTURE}" == "root-full-no-data" ]]; then
    echo "Disk: /dev/mmcblk0 size=29.1G"
    echo "Root partition: /dev/mmcblk0p2 size=28.6G mount=/"
    echo "Data mount: missing"
    fail "online root shrink is not supported; reflash with growpart disabled or resize offline before creating /data"
  fi

  if [[ "${DISK_FIXTURE}" == "writable-data" ]]; then
    echo "Disk: /dev/mmcblk0 size=29.1G"
    echo "Root partition: /dev/mmcblk0p2 size=12G mount=/"
    echo "Data mount: /dev/mmcblk0p3 mounted at /data"
    ok "existing writable /data mount can be reused"
    return 0
  fi

  if [[ "${MODE}" == "update" ]]; then
    findmnt /data >/dev/null 2>&1 || fail "/data runtime mount is missing in update mode"
    ok "update mode will not modify disk partitions"
    return 0
  fi

  if findmnt /data >/dev/null 2>&1; then
    ok "existing writable /data mount can be reused"
    return 0
  fi

  if [[ "${CREATE_DATA_PARTITION}" == "1" ]]; then
    create_data_partition
    return 0
  fi

  print_disk_summary
  fail "No /data mount found. Re-run init with --create-data-partition --data-size-gb ${DATA_SIZE_GB}, or prepare /data manually."
}

print_disk_summary() {
  echo "Detected disk layout:"
  lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS || true
}

create_data_partition() {
  [[ "${EUID}" -eq 0 ]] || fail "creating /data partition must run as root"
  if [[ -n "${ROOT_SIZE_GB}" ]]; then
    [[ "${ROOT_SIZE_GB}" =~ ^[0-9]+$ ]] || fail "--root-size-gb must be an integer"
  else
    [[ "${DATA_SIZE_GB}" =~ ^[0-9]+$ ]] || fail "--data-size-gb must be an integer"
  fi
  command -v parted >/dev/null 2>&1 || fail "parted is required to create /data"
  command -v resize2fs >/dev/null 2>&1 || fail "resize2fs is required to grow root"
  command -v mkfs.ext4 >/dev/null 2>&1 || fail "mkfs.ext4 is required to create /data"

  root_dev="$(findmnt -no SOURCE /)"
  disk_name="$(lsblk -no PKNAME "${root_dev}" | head -n1)"
  [[ -n "${disk_name}" ]] || fail "Unable to resolve parent disk for ${root_dev}"
  disk_dev="/dev/${disk_name}"
  root_part_name="$(basename "${root_dev}")"
  root_part_num="${root_part_name##*[!0-9]}"
  [[ -n "${root_part_num}" ]] || fail "Unable to resolve root partition number for ${root_dev}"
  data_part_num=$((root_part_num + 1))
  if [[ "${disk_dev}" == *"mmcblk"* || "${disk_dev}" == *"nvme"* ]]; then
    data_dev="${disk_dev}p${data_part_num}"
  else
    data_dev="${disk_dev}${data_part_num}"
  fi

  if [[ -e "${data_dev}" ]]; then
    fail "Data partition already exists but is not mounted: ${data_dev}"
  fi

  root_size_bytes="$(blockdev --getsize64 "${root_dev}")"
  disk_size_bytes="$(blockdev --getsize64 "${disk_dev}")"
  if [[ -n "${ROOT_SIZE_GB}" ]]; then
    desired_root_bytes=$((ROOT_SIZE_GB * 1024 * 1024 * 1024))
    root_end="${ROOT_SIZE_GB}GiB"
    layout_label="root target size ${ROOT_SIZE_GB}G; /data will use remaining space"
  else
    desired_root_bytes=$((disk_size_bytes - (DATA_SIZE_GB * 1024 * 1024 * 1024)))
    (( desired_root_bytes > 0 )) || fail "--data-size-gb is larger than the disk"
    root_end="${desired_root_bytes}B"
    layout_label="/data target size ${DATA_SIZE_GB}G; root will use remaining leading space"
  fi
  if (( root_size_bytes > desired_root_bytes )); then
    fail "online root shrink is not supported; current root is larger than the requested layout"
  fi

  print_disk_summary
  echo "Creating ${data_dev}; ${layout_label}."
  if [[ -t 0 ]]; then
    read -r -p "Type CREATE-DATA to continue: " confirmation
    [[ "${confirmation}" == "CREATE-DATA" ]] || fail "Data partition creation cancelled"
  else
    [[ "${CONFIRM_CREATE_DATA:-}" == "CREATE-DATA" ]] || fail "Set CONFIRM_CREATE_DATA=CREATE-DATA to create /data non-interactively"
  fi

  printf 'Yes\n' | parted ---pretend-input-tty "${disk_dev}" resizepart "${root_part_num}" "${root_end}"
  partprobe "${disk_dev}" || true
  resize2fs "${root_dev}"
  root_end_sector="$(parted -m "${disk_dev}" unit s print | awk -F: -v part="${root_part_num}" '$1 == part { gsub(/s$/, "", $3); print $3 }')"
  [[ -n "${root_end_sector}" ]] || fail "Unable to resolve root partition end sector after resize"
  data_start_sector=$(( ((root_end_sector + 2048) / 2048) * 2048 ))
  parted -s "${disk_dev}" unit s mkpart primary ext4 "${data_start_sector}s" 100%
  partprobe "${disk_dev}" || true
  udevadm settle || true
  mkfs.ext4 -F -L data "${data_dev}"
  install -d -m 755 /data
  data_uuid="$(blkid -s UUID -o value "${data_dev}")"
  grep -q "[[:space:]]/data[[:space:]]" /etc/fstab || printf 'UUID=%s /data ext4 defaults,noatime 0 2\n' "${data_uuid}" >> /etc/fstab
  mount /data
  ok "created and mounted /data at ${data_dev}"
}

configure_env() {
  mkdir -p "${INSTALL_DIR}"
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    echo "MQTT defaults were not overwritten because target .env already exists"
    return 0
  fi

  if [[ -f "${INSTALL_DIR}/.env.example" ]]; then
    cp "${INSTALL_DIR}/.env.example" "${INSTALL_DIR}/.env"
  else
    : > "${INSTALL_DIR}/.env"
  fi

  tmp_env="$(mktemp)"
  if grep -q '^MQTT_BROKER=' "${INSTALL_DIR}/.env"; then
    awk -v host="${MQTT_HOST}" 'BEGIN{done=0} /^MQTT_BROKER=/{print "MQTT_BROKER=" host; done=1; next} {print} END{if(!done) print "MQTT_BROKER=" host}' "${INSTALL_DIR}/.env" > "${tmp_env}"
    cat "${tmp_env}" > "${INSTALL_DIR}/.env"
  elif grep -q '^MQTT_BROKER_HOST=' "${INSTALL_DIR}/.env"; then
    awk -v host="${MQTT_HOST}" 'BEGIN{done=0} /^MQTT_BROKER_HOST=/{print "MQTT_BROKER_HOST=" host; done=1; next} {print} END{if(!done) print "MQTT_BROKER_HOST=" host}' "${INSTALL_DIR}/.env" > "${tmp_env}"
    cat "${tmp_env}" > "${INSTALL_DIR}/.env"
  else
    printf 'MQTT_BROKER=%s\n' "${MQTT_HOST}" >> "${INSTALL_DIR}/.env"
  fi
  if grep -q '^MQTT_DATA_MODE=' "${INSTALL_DIR}/.env"; then
    awk 'BEGIN{done=0} /^MQTT_DATA_MODE=/{print "MQTT_DATA_MODE=mqtt"; done=1; next} {print} END{if(!done) print "MQTT_DATA_MODE=mqtt"}' "${INSTALL_DIR}/.env" > "${tmp_env}"
    cat "${tmp_env}" > "${INSTALL_DIR}/.env"
  else
    printf 'MQTT_DATA_MODE=mqtt\n' >> "${INSTALL_DIR}/.env"
  fi
  rm -f "${tmp_env}"
  echo "Created target .env with MQTT host ${MQTT_HOST}"
}

copy_bundle() {
  [[ -n "${BUNDLE_DIR}" ]] || fail "--bundle-dir is required"
  [[ -d "${BUNDLE_DIR}" ]] || fail "Bundle dir not found: ${BUNDLE_DIR}"
  mkdir -p "${INSTALL_DIR}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude .env \
      --exclude data \
      --exclude logs \
      --exclude uploads \
      "${BUNDLE_DIR}/" "${INSTALL_DIR}/"
  else
    find "${INSTALL_DIR}" -mindepth 1 -maxdepth 1 \
      ! -name ".env" \
      ! -name "data" \
      ! -name "logs" \
      ! -name "uploads" \
      -exec rm -rf {} +
    (
      cd "${BUNDLE_DIR}"
      shopt -s dotglob nullglob
      for entry in *; do
        case "${entry}" in
          .env|data|logs|uploads)
            continue
            ;;
        esac
        cp -R "${entry}" "${INSTALL_DIR}/"
      done
    )
  fi
  mkdir -p "${INSTALL_DIR}/data" "${INSTALL_DIR}/logs" "${INSTALL_DIR}/uploads/images" "${INSTALL_DIR}/uploads/brand"
  chown -R "${KIOSK_USER}:${KIOSK_USER}" "${INSTALL_DIR}"
}

install_node_if_needed() {
  if sudo -u "${KIOSK_USER}" bash -lc 'command -v node >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1'; then
    ok "node and pnpm already available"
    return 0
  fi

  apt-get update
  apt-get install -y curl ca-certificates
  sudo -u "${KIOSK_USER}" bash -lc '
    set -euo pipefail
    export NVM_DIR="${HOME}/.nvm"
    if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi
    . "${NVM_DIR}/nvm.sh"
    nvm install --lts
    corepack enable
    corepack prepare pnpm@10.33.2 --activate
  '
}

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Bootstrap dry run"
  echo "Mode: ${MODE}"
  echo "Install dir: ${INSTALL_DIR}"
  echo "MQTT host: ${MQTT_HOST}"
  echo "Desktop: ${DESKTOP}"
  echo "RDP auth: ${RDP_AUTH}"
fi

check_host
check_disk_layout

if [[ "${DRY_RUN}" == "1" ]]; then
  if [[ "${MODE}" == "update" ]]; then
    ok "would stop solar-display when active and create a verified runtime backup before replacing application files"
    ok "would fail closed on backup verification failure without replacing application files"
    ok "would report backup path and recovery command (no automatic production DB rollback)"
  else
    ok "init mode would skip runtime backup gate (no existing runtime)"
  fi
  ok "would copy bundle, install dependencies, configure desktop, install kiosk, and verify"
  ok "would print recovery handoff if later installation or health verification fails"
  exit 0
fi

configure_env

if [[ "${CONFIGURE_ENV_ONLY}" == "1" ]]; then
  exit 0
fi

# Fail-closed backup gate: update mode must verify a snapshot before copy_bundle.
create_verified_runtime_backup

copy_bundle
configure_env
install_node_if_needed

(
  cd "${INSTALL_DIR}"
  sudo -u "${KIOSK_USER}" bash -lc 'source "${HOME}/.nvm/nvm.sh" 2>/dev/null || true; pnpm install --prod --no-frozen-lockfile'
)

"${INSTALL_DIR}/deploy/configure-lightweight-desktop.sh" \
  --user "${KIOSK_USER}" \
  --desktop "${DESKTOP}" \
  --rdp-auth "${RDP_AUTH}" \
  ${RDP_PASSWORD:+--rdp-password "${RDP_PASSWORD}"}

INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${INSTALL_DIR}/deploy/install-kiosk.sh"

set +e
"${INSTALL_DIR}/deploy/verify-kiosk-install.sh" --install-dir "${INSTALL_DIR}" --kiosk-user "${KIOSK_USER}"
verify_status=$?
set -e

if [[ "${verify_status}" -ne 0 ]]; then
  echo "ERROR: kiosk/health verification failed after application replacement" >&2
  print_recovery_handoff
  exit "${verify_status}"
fi

if [[ -n "${BACKUP_DIR}" ]]; then
  ok "update completed with verified backup at ${BACKUP_DIR}"
  echo "Recovery command (temp drill): ${INSTALL_DIR}/deploy/restore-runtime-state.sh --backup-dir ${BACKUP_DIR} --drill"
fi

if [[ "${APPLY_READONLY}" == "1" ]]; then
  APPLY_READONLY_ROOT=1 INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${INSTALL_DIR}/deploy/enable-readonly-root.sh"
else
  INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${INSTALL_DIR}/deploy/enable-readonly-root.sh"
fi
