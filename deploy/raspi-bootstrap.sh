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
    cp -R "${BUNDLE_DIR}/." "${INSTALL_DIR}/"
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
  ok "would copy bundle, install dependencies, configure desktop, install kiosk, and verify"
  exit 0
fi

configure_env

if [[ "${CONFIGURE_ENV_ONLY}" == "1" ]]; then
  exit 0
fi

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
"${INSTALL_DIR}/deploy/verify-kiosk-install.sh" --install-dir "${INSTALL_DIR}" --kiosk-user "${KIOSK_USER}"

if [[ "${APPLY_READONLY}" == "1" ]]; then
  APPLY_READONLY_ROOT=1 INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${INSTALL_DIR}/deploy/enable-readonly-root.sh"
else
  INSTALL_DIR="${INSTALL_DIR}" KIOSK_USER="${KIOSK_USER}" "${INSTALL_DIR}/deploy/enable-readonly-root.sh"
fi
