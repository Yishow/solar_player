#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TARGET="${1:-}"
MODE="update"
INSTALL_DIR="/data/solar-display"
MQTT_HOST="192.168.31.62"
BUNDLE="online"
DESKTOP="xfce-xrdp"
RDP_AUTH="passwordless"
RDP_PASSWORD="${RDP_PASSWORD:-}"
SUDO_PASSWORD="${SUDO_PASSWORD:-${SSH_PASSWORD:-}}"
KIOSK_USER=""
DRY_RUN=0
SKIP_DISK=0
APPLY_READONLY=0
CREATE_DATA_PARTITION=0
ROOT_SIZE_GB=""
DATA_SIZE_GB="10"
MQTT_HOST_EXPLICIT=0
DATA_SIZE_GB_EXPLICIT=0

usage() {
  cat <<EOF
Usage: scripts/raspi-onekey-deploy.sh <user@host> [options]

Options:
  --mode init|update
  --install-dir <path>
  --mqtt-host <host>
  --bundle online|offline
  --desktop xfce-xrdp|none
  --rdp-auth passwordless|system-password
  --rdp-password <password>
  --sudo-password <password>
  --kiosk-user <user>
  --dry-run
  --skip-disk
  --apply-readonly
  --create-data-partition
  --data-size-gb <gb>
  --root-size-gb <gb>     Override data-size behavior and keep this much root space.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

load_first_boot_deploy_env() {
  [[ "${MODE}" == "init" ]] || return 0
  if [[ "${MQTT_HOST_EXPLICIT}" == "1" && "${DATA_SIZE_GB_EXPLICIT}" == "1" ]]; then
    return 0
  fi

  remote_env="$("${ssh_base[@]}" "if [ -r /boot/firmware/solar-deploy.env ]; then sed -n -E '/^(DATA_SIZE_GB|MQTT_HOST)=/p' /boot/firmware/solar-deploy.env; fi")"
  [[ -n "${remote_env}" ]] || return 0

  loaded=0
  while IFS='=' read -r key value; do
    case "${key}" in
      DATA_SIZE_GB)
        if [[ "${DATA_SIZE_GB_EXPLICIT}" == "0" ]]; then
          [[ "${value}" =~ ^[1-9][0-9]*$ ]] || fail "Invalid DATA_SIZE_GB in /boot/firmware/solar-deploy.env: ${value}"
          DATA_SIZE_GB="${value}"
          loaded=1
        fi
        ;;
      MQTT_HOST)
        if [[ "${MQTT_HOST_EXPLICIT}" == "0" ]]; then
          [[ -n "${value}" ]] || fail "Invalid MQTT_HOST in /boot/firmware/solar-deploy.env"
          MQTT_HOST="${value}"
          loaded=1
        fi
        ;;
    esac
  done <<< "${remote_env}"

  if [[ "${loaded}" == "1" ]]; then
    echo "Loaded first-boot deploy env from /boot/firmware/solar-deploy.env"
    echo "Effective MQTT host: ${MQTT_HOST}"
    echo "Effective data size: ${DATA_SIZE_GB}G"
  fi
}

if [[ -z "${TARGET}" || "${TARGET}" == --* ]]; then
  usage >&2
  exit 1
fi
shift

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="${2:-}"
      shift 2
      ;;
    --mqtt-host)
      MQTT_HOST="${2:-}"
      MQTT_HOST_EXPLICIT=1
      shift 2
      ;;
    --bundle)
      BUNDLE="${2:-}"
      shift 2
      ;;
    --desktop)
      DESKTOP="${2:-}"
      shift 2
      ;;
    --rdp-auth)
      RDP_AUTH="${2:-}"
      shift 2
      ;;
    --rdp-password)
      RDP_PASSWORD="${2:-}"
      shift 2
      ;;
    --sudo-password)
      SUDO_PASSWORD="${2:-}"
      shift 2
      ;;
    --kiosk-user)
      KIOSK_USER="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --skip-disk)
      SKIP_DISK=1
      shift
      ;;
    --apply-readonly)
      APPLY_READONLY=1
      shift
      ;;
    --create-data-partition)
      CREATE_DATA_PARTITION=1
      shift
      ;;
    --root-size-gb)
      ROOT_SIZE_GB="${2:-}"
      shift 2
      ;;
    --data-size-gb)
      DATA_SIZE_GB="${2:-}"
      DATA_SIZE_GB_EXPLICIT=1
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

[[ "${MODE}" == "init" || "${MODE}" == "update" ]] || fail "--mode must be init or update"
[[ "${BUNDLE}" == "online" || "${BUNDLE}" == "offline" ]] || fail "--bundle must be online or offline"
[[ "${DESKTOP}" == "xfce-xrdp" || "${DESKTOP}" == "none" ]] || fail "--desktop must be xfce-xrdp or none"
[[ "${RDP_AUTH}" == "passwordless" || "${RDP_AUTH}" == "system-password" ]] || fail "--rdp-auth must be passwordless or system-password"

if [[ -z "${KIOSK_USER}" ]]; then
  if [[ "${TARGET}" == *@* ]]; then
    KIOSK_USER="${TARGET%@*}"
  else
    KIOSK_USER="pi"
  fi
fi

readonly_label="dry-run"
if [[ "${APPLY_READONLY}" == "1" ]]; then
  readonly_label="apply"
fi

cat <<EOF
Solar Display Raspberry Pi deploy
Target: ${TARGET}
Mode: ${MODE}
Install dir: ${INSTALL_DIR}
MQTT host: ${MQTT_HOST}
Bundle: ${BUNDLE}
Desktop: ${DESKTOP}
RDP auth: ${RDP_AUTH}
Kiosk user: ${KIOSK_USER}
Readonly root: ${readonly_label}
EOF

if [[ "${DRY_RUN}" == "1" ]]; then
  cat <<EOF
Dry run stages:
OK: would verify SSH reachability and sudo access
OK: would build ${BUNDLE} bundle
OK: would upload bundle to target staging directory
OK: would run remote bootstrap
OK: update mode does not run disk partition, filesystem format, or mount table mutation
EOF
  exit 0
fi

if [[ "${RDP_AUTH}" == "passwordless" && -z "${RDP_PASSWORD}" ]]; then
  fail "RDP passwordless requires --rdp-password or RDP_PASSWORD; SSH and sudo remain password-protected"
fi

choice=1
bundle_root="${PROJECT_DIR}/dist/deploy-bundles/online"
if [[ "${BUNDLE}" == "offline" ]]; then
  choice=2
  bundle_root="${PROJECT_DIR}/dist/deploy-bundles/offline"
fi

echo "[1/5] Building ${BUNDLE} bundle..."
(
  cd "${PROJECT_DIR}"
  DEPLOY_CHOICE="${choice}" ./deploy.sh
)

remote_stage="/tmp/solar-display-deploy-${BUNDLE}-$(date +%Y%m%d%H%M%S)"
ssh_base=(ssh -o StrictHostKeyChecking=accept-new "${TARGET}")
rsync_rsh="ssh -o StrictHostKeyChecking=accept-new"
if [[ -n "${SSH_PASSWORD:-}" ]]; then
  command -v sshpass >/dev/null 2>&1 || fail "SSH_PASSWORD was set but sshpass is not installed"
  # Pass the password via the environment (sshpass -e) instead of argv so it is not
  # exposed in `ps` and is not word-split when embedded in the rsync -e string.
  export SSHPASS="${SSH_PASSWORD}"
  ssh_password_options=(-o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no -o IdentitiesOnly=yes)
  ssh_base=(sshpass -e ssh "${ssh_password_options[@]}" "${TARGET}")
  rsync_rsh="sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no -o IdentitiesOnly=yes"
fi

echo "[2/5] Checking SSH..."
"${ssh_base[@]}" "printf 'OK: ssh reachable on %s\n' \"\$(hostname)\""
load_first_boot_deploy_env

echo "[3/5] Uploading bundle..."
"${ssh_base[@]}" "rm -rf '${remote_stage}' && mkdir -p '${remote_stage}'"
rsync -az --delete -e "${rsync_rsh}" "${bundle_root}/" "${TARGET}:${remote_stage}/"

remote_args=(
  "--mode" "${MODE}"
  "--install-dir" "${INSTALL_DIR}"
  "--mqtt-host" "${MQTT_HOST}"
  "--bundle-dir" "${remote_stage}"
  "--desktop" "${DESKTOP}"
  "--rdp-auth" "${RDP_AUTH}"
  "--kiosk-user" "${KIOSK_USER}"
)
if [[ -n "${RDP_PASSWORD}" ]]; then
  remote_args+=("--rdp-password" "${RDP_PASSWORD}")
fi
if [[ "${SKIP_DISK}" == "1" ]]; then
  remote_args+=("--skip-disk")
fi
if [[ "${CREATE_DATA_PARTITION}" == "1" ]]; then
  remote_args+=("--create-data-partition")
  if [[ -n "${ROOT_SIZE_GB}" ]]; then
    remote_args+=("--root-size-gb" "${ROOT_SIZE_GB}")
  else
    remote_args+=("--data-size-gb" "${DATA_SIZE_GB}")
  fi
fi
if [[ "${APPLY_READONLY}" == "1" ]]; then
  remote_args+=("--apply-readonly")
fi

printf -v quoted_args " %q" "${remote_args[@]}"
echo "[4/5] Running remote bootstrap..."
if [[ -n "${SUDO_PASSWORD}" ]]; then
  quoted_sudo_password="$(printf '%q' "${SUDO_PASSWORD}")"
  "${ssh_base[@]}" "cd '${remote_stage}' && printf '%s\n' ${quoted_sudo_password} | sudo -S env CONFIRM_CREATE_DATA=CREATE-DATA ./deploy/raspi-bootstrap.sh${quoted_args}"
else
  "${ssh_base[@]}" "cd '${remote_stage}' && sudo env CONFIRM_CREATE_DATA=CREATE-DATA ./deploy/raspi-bootstrap.sh${quoted_args}"
fi

echo "[5/5] Done."
