#!/bin/bash
set +x
set -euo pipefail

LC_ALL=C
SOLAR_DEPLOY_MAIN=1

# BEGIN SOLAR DEPLOY SECRET RECEIVER
if [[ "${SOLAR_DEPLOY_MAIN:-0}" != "1" ]]; then
  set +x
  set -euo pipefail
  LC_ALL=C

  receiver_fail() {
    printf 'ERROR: secret receiver: %s\n' "$*" >&2
    exit 1
  }

  receiver_root="${SOLAR_SECRET_RECEIVER_ROOT:-${TMPDIR:-/tmp}/solar-display-deploy-secrets-${UID}}"
  receiver_invocation_id="${SOLAR_SECRET_INVOCATION_ID:-${$}-${RANDOM}-${RANDOM}-${RANDOM}}"
  receiver_bootstrap_command="${SOLAR_SECRET_RECEIVER_BOOTSTRAP_CMD:-${SOLAR_SECRET_RECEIVER_BOOTSTRAP:-./deploy/raspi-bootstrap.sh}}"
  receiver_sudo_command="${SOLAR_SECRET_RECEIVER_SUDO_CMD:-${SOLAR_SECRET_RECEIVER_SUDO:-sudo}}"
  receiver_stat_command="${SOLAR_SECRET_RECEIVER_STAT_CMD:-stat}"
  receiver_parent=""
  receiver_parent_state="none"
  receiver_file=""
  receiver_marker=""
  receiver_owner_uid=""
  receiver_file_owner_uid=""
  receiver_marker_owner_uid=""
  receiver_cleanup_running=0
  receiver_cleanup_result=0
  receiver_frame_fd=""
  receiver_payload_fd=""

  command -v perl >/dev/null 2>&1 || receiver_fail "perl is required for byte-safe secret frame parsing"
  exec {receiver_frame_fd}< <(perl -e '
    my $frame = "";
    while (read(STDIN, my $chunk, 8192)) {
      $frame .= $chunk;
      exit 65 if index($frame, "\x00") >= 0;
      exit 66 if length($frame) > 8236;
    }
    print $frame or exit 1;
  ')

  receiver_stat_value=""
  receiver_stat_field() {
    local format="$1"
    local path_value="$2"
    local bsd_format="${format}"

    if [[ "${format}" == "%a" ]]; then
      bsd_format="%Lp"
    fi

    receiver_stat_value=""
    if IFS= read -r receiver_stat_value < <("${receiver_stat_command}" -c "${format}" "${path_value}" 2>/dev/null); then
      return 0
    fi
    receiver_stat_value=""
    IFS= read -r receiver_stat_value < <("${receiver_stat_command}" -f "${bsd_format}" "${path_value}" 2>/dev/null)
  }

  receiver_has_mode() {
    local path_value="$1"
    local expected_mode="$2"
    receiver_stat_field '%a' "${path_value}" || return 1
    [[ "${receiver_stat_value}" == "${expected_mode}" ]]
  }

  receiver_owner_uid() {
    receiver_stat_field '%u' "$1" || return 1
    [[ "${receiver_stat_value}" =~ ^[0-9]+$ ]] || return 1
    receiver_owner_uid="${receiver_stat_value}"
  }

  receiver_validate_root() {
    [[ "${receiver_root}" == /* && "${receiver_root}" != "/" ]] || receiver_fail "secret receiver root must be an absolute non-root path"
    [[ "${receiver_root}" != *$'\n'* && "${receiver_root}" != *$'\r'* ]] \
      || receiver_fail "secret receiver root contains a forbidden byte"

    if [[ ! -e "${receiver_root}" ]]; then
      mkdir -p "${receiver_root}" || receiver_fail "cannot create secret receiver root"
    fi
    [[ -d "${receiver_root}" && ! -L "${receiver_root}" ]] || receiver_fail "secret receiver root is not a regular directory"
    receiver_owner_uid "${receiver_root}" || receiver_fail "cannot verify secret receiver root owner"
    [[ "${receiver_owner_uid}" == "0" || "${receiver_owner_uid}" == "${EUID}" ]] \
      || receiver_fail "secret receiver root owner is not the invoking user or root"
    chmod 700 "${receiver_root}" || receiver_fail "cannot secure secret receiver root"
    receiver_has_mode "${receiver_root}" 700 || receiver_fail "secret receiver root is not mode 700"
  }

  receiver_validate_parent_shape() {
    local root_prefix="${receiver_root%/}"
    local suffix
    [[ -n "${receiver_parent}" && "${receiver_parent}" == "${root_prefix}/.solar-deploy-"* ]] || return 1
    suffix="${receiver_parent#"${root_prefix}/.solar-deploy-"}"
    [[ -n "${suffix}" && "${suffix}" != */* ]] || return 1
    [[ -d "${receiver_parent}" && ! -L "${receiver_parent}" ]] || return 1
    receiver_has_mode "${receiver_parent}" 700 || return 1
    receiver_owner_uid "${receiver_parent}" || return 1
    [[ "${receiver_owner_uid}" == "0" || "${receiver_owner_uid}" == "${EUID}" ]] || return 1
  }

  receiver_read_line() {
    receiver_line=""
    IFS= read -r receiver_line <&"${receiver_frame_fd}"
  }

  receiver_read_payload() {
    local payload_length="$1"

    receiver_payload=""
    if (( payload_length == 0 )); then
      return 0
    fi
    IFS= read -r -d '' -n "${payload_length}" receiver_payload <&"${receiver_frame_fd}" || true
    [[ "${#receiver_payload}" -eq "${payload_length}" ]] || return 1
    [[ "${receiver_payload}" != *$'\r'* && "${receiver_payload}" != *$'\n'* ]] || return 1
  }

  receiver_read_delimiter() {
    receiver_delimiter=""
    IFS= read -r -N 1 receiver_delimiter <&"${receiver_frame_fd}" || return 1
    [[ "${receiver_delimiter}" == $'\n' ]]
  }

  receiver_parse_frame() {
    local field_name field_length field_length_line
    local sudo_length_line rdp_length_line
    local frame_total

    receiver_read_line || receiver_fail "secret frame is truncated before magic"
    [[ "${receiver_line}" == "SOLAR-DEPLOY-SECRET-FRAME/1" ]] || receiver_fail "secret frame magic is invalid"

    for field_name in sudo rdp; do
      receiver_read_line || receiver_fail "secret frame is truncated before ${field_name} length"
      field_length_line="${receiver_line}"
      [[ "${receiver_line}" =~ ^(0|[1-9][0-9]{0,3})$ ]] || receiver_fail "secret frame ${field_name} length is not canonical"
      field_length=$((10#${receiver_line}))
      (( field_length <= 4096 )) || receiver_fail "secret frame ${field_name} value is overlong"

      if ! receiver_read_payload "${field_length}"; then
        receiver_fail "secret frame ${field_name} payload is truncated or contains an unsafe byte"
      fi
      receiver_read_delimiter || receiver_fail "secret frame ${field_name} delimiter is invalid"
      if [[ "${field_name}" == "sudo" ]]; then
        sudo_length_line="${field_length_line}"
        receiver_sudo_password="${receiver_payload}"
        receiver_sudo_length="${field_length}"
      else
        rdp_length_line="${field_length_line}"
        receiver_rdp_password="${receiver_payload}"
        receiver_rdp_length="${field_length}"
      fi
    done

    frame_total=$((28 + ${#sudo_length_line} + 1 + receiver_sudo_length + 1 + ${#rdp_length_line} + 1 + receiver_rdp_length + 1 + 4))
    (( frame_total <= 8236 )) || receiver_fail "secret frame is overlong"

    receiver_read_line || receiver_fail "secret frame is truncated before END"
    [[ "${receiver_line}" == "END" ]] || receiver_fail "secret frame terminator is invalid"
    receiver_extra=""
    if IFS= read -r -d '' receiver_extra <&"${receiver_frame_fd}"; then
      receiver_fail "secret frame contains extra bytes after END"
    fi
    [[ -z "${receiver_extra}" ]] || receiver_fail "secret frame contains extra bytes after END"
  }

  receiver_validate_marker() {
    local marker_magic marker_owner marker_file marker_extra
    local marker_fd marker_status
    [[ -n "${receiver_marker}" && -f "${receiver_marker}" && ! -L "${receiver_marker}" ]] || return 1
    receiver_has_mode "${receiver_marker}" 600 || return 1
    receiver_owner_uid "${receiver_marker}" || return 1
    receiver_marker_owner_uid="${receiver_owner_uid}"
    [[ "${receiver_marker_owner_uid}" == "${receiver_file_owner_uid}" || "${receiver_marker_owner_uid}" == "0" ]] || return 1

    marker_magic=""
    marker_owner=""
    marker_file=""
    marker_extra=""
    exec {marker_fd}<"${receiver_marker}" || return 1
    if ! IFS= read -r marker_magic <&"${marker_fd}"; then
      exec {marker_fd}<&- || true
      return 1
    fi
    if ! IFS= read -r marker_owner <&"${marker_fd}"; then
      exec {marker_fd}<&- || true
      return 1
    fi
    if ! IFS= read -r marker_file <&"${marker_fd}"; then
      exec {marker_fd}<&- || true
      return 1
    fi
    if IFS= read -r marker_extra <&"${marker_fd}"; then
      marker_status=0
    else
      marker_status=$?
    fi
    exec {marker_fd}<&- || return 1
    (( marker_status != 0 )) || return 1
    [[ "${marker_magic}" == "SOLAR-DEPLOY-SECRET-MARKER/1" ]] || return 1
    [[ "${marker_owner}" == "owner=${receiver_file_owner_uid}" ]] || return 1
    [[ "${marker_file}" == "file=rdp-password" ]] || return 1
    [[ -z "${marker_extra}" ]] || return 1
  }

  receiver_validate_owned_paths() {
    [[ -n "${receiver_parent}" && -n "${receiver_file}" && -n "${receiver_marker}" ]] || return 1
    receiver_validate_parent_shape || return 1
    [[ "${receiver_file}" == "${receiver_parent}/rdp-password" ]] || return 1
    [[ "${receiver_marker}" == "${receiver_parent}/.solar-deploy-secret-marker" ]] || return 1
    [[ -f "${receiver_file}" && ! -L "${receiver_file}" ]] || return 1
    receiver_has_mode "${receiver_file}" 600 || return 1
    receiver_owner_uid "${receiver_file}" || return 1
    [[ "${receiver_owner_uid}" == "${receiver_file_owner_uid}" || "${receiver_owner_uid}" == "0" ]] || return 1
    receiver_validate_marker
  }

  receiver_cleanup() {
    local cleanup_status=0
    local cleanup_reason=""
    local exit_status="${1:-1}"
    if [[ "${receiver_cleanup_running}" == "1" ]]; then
      # Re-entry never re-deletes and never lets a success exit hide an unconfirmed cleanup.
      if [[ "${exit_status}" == "0" && "${receiver_cleanup_result}" != "0" ]]; then
        return 1
      fi
      return "${exit_status}"
    fi
    receiver_cleanup_running=1
    receiver_cleanup_result=1

    if [[ -n "${receiver_frame_fd}" ]]; then
      exec {receiver_frame_fd}<&- || cleanup_status=1
      receiver_frame_fd=""
    fi
    if [[ -n "${receiver_payload_fd}" ]]; then
      exec {receiver_payload_fd}>&- || cleanup_status=1
      receiver_payload_fd=""
    fi
    if [[ "${cleanup_status}" != "0" ]]; then
      cleanup_reason="descriptor close failed"
    fi

    case "${receiver_parent_state}" in
      created)
        # Full validation is the only deletion gate; on failure keep parent, payload, and marker.
        if receiver_validate_owned_paths; then
          rm -f -- "${receiver_file}" "${receiver_marker}" || cleanup_status=1
          rmdir -- "${receiver_parent}" 2>/dev/null || cleanup_status=1
          if [[ -e "${receiver_parent}" || -L "${receiver_parent}" ]]; then
            cleanup_status=1
          fi
          if [[ "${cleanup_status}" != "0" && -z "${cleanup_reason}" ]]; then
            cleanup_reason="removal of validated paths was not confirmed"
          fi
        else
          cleanup_status=1
          cleanup_reason="owner, mode, marker, type, or containment validation failed"
        fi
        ;;
      creating)
        cleanup_status=1
        cleanup_reason="secret parent creation was interrupted before ownership was recorded"
        ;;
    esac

    if [[ "${cleanup_status}" == "0" ]]; then
      printf 'RDP secret cleanup: ok\n' >&2
    elif [[ "${receiver_parent_state}" == "created" ]]; then
      printf 'RDP secret cleanup: unknown; %s; revalidate owner, marker, type, and containment before removing exact invocation-owned path: %s\n' \
        "${cleanup_reason}" "${receiver_parent}" >&2
    else
      printf 'RDP secret cleanup: unknown; %s\n' "${cleanup_reason}" >&2
    fi
    receiver_cleanup_result="${cleanup_status}"
    if [[ "${cleanup_status}" != "0" && "${exit_status}" == "0" ]]; then
      return 1
    fi
    return "${exit_status}"
  }

  trap 'receiver_cleanup $?' EXIT
  trap 'exit 129' HUP INT TERM

  receiver_parse_frame
  receiver_validate_root
  [[ "${receiver_invocation_id}" =~ ^[A-Za-z0-9._-]+$ ]] || receiver_fail "secret invocation id is invalid"
  receiver_parent="${receiver_root%/}/.solar-deploy-${receiver_invocation_id}"
  # Ownership starts only after mkdir succeeds; a pre-existing candidate is never acquired.
  receiver_parent_state="creating"
  if ! mkdir -m 700 -- "${receiver_parent}"; then
    receiver_parent_state="none"
    receiver_fail "cannot create invocation-owned secret parent"
  fi
  receiver_parent_state="created"
  receiver_file="${receiver_parent}/rdp-password"
  receiver_marker="${receiver_parent}/.solar-deploy-secret-marker"
  receiver_validate_parent_shape || receiver_fail "secret parent failed ownership or mode validation"
  receiver_file_owner_uid="${receiver_owner_uid}"

  if ! (set -C; : > "${receiver_file}"); then
    receiver_fail "cannot create invocation-owned RDP file"
  fi
  chmod 600 "${receiver_file}" || receiver_fail "cannot secure invocation-owned RDP file"
  if ! exec {receiver_payload_fd}>"${receiver_file}"; then
    receiver_fail "cannot open invocation-owned RDP file"
  fi
  printf '%s' "${receiver_rdp_password}" >&"${receiver_payload_fd}" || receiver_fail "cannot write invocation-owned RDP file"
  exec {receiver_payload_fd}>&- || receiver_fail "cannot close invocation-owned RDP file"
  receiver_payload_fd=""
  [[ -f "${receiver_file}" && ! -L "${receiver_file}" ]] || receiver_fail "RDP file is not a regular non-symlink"
  receiver_has_mode "${receiver_file}" 600 || receiver_fail "RDP file is not mode 600"
  receiver_owner_uid "${receiver_file}" || receiver_fail "cannot verify RDP file owner"
  [[ "${receiver_owner_uid}" == "${receiver_file_owner_uid}" || "${receiver_owner_uid}" == "0" ]] \
    || receiver_fail "RDP file owner is not the receiver owner or root"

  if ! (set -C; : > "${receiver_marker}"); then
    receiver_fail "cannot create invocation-owned marker"
  fi
  chmod 600 "${receiver_marker}" || receiver_fail "cannot secure invocation-owned marker"
  printf 'SOLAR-DEPLOY-SECRET-MARKER/1\nowner=%s\nfile=rdp-password\n' "${receiver_file_owner_uid}" > "${receiver_marker}"
  receiver_validate_owned_paths || receiver_fail "invocation-owned RDP channel failed validation"
  printf 'RDP_PASSWORD_FILE=%s\n' "${receiver_file}"

  receiver_args=("$@")
  for receiver_arg in "${receiver_args[@]}"; do
    [[ "${receiver_arg}" != "--rdp-password" && "${receiver_arg}" != "--sudo-password" && "${receiver_arg}" != "--rdp-password-file" ]] \
      || receiver_fail "secret options are not accepted by the receiver"
  done

  if (( ${#receiver_args[@]} == 0 )); then
    exit 0
  fi

  receiver_status=0
  set +e
  if [[ "${EUID}" -eq 0 ]]; then
    SOLAR_SECRET_ALLOWED_ROOTS="${receiver_root}" CONFIRM_CREATE_DATA=CREATE-DATA \
      "${receiver_bootstrap_command}" "${receiver_args[@]}" --rdp-password-file "${receiver_file}"
    receiver_status=$?
  elif [[ "${receiver_sudo_length}" -gt 0 ]]; then
    printf '%s\n' "${receiver_sudo_password}" | "${receiver_sudo_command}" -S env \
      SOLAR_SECRET_ALLOWED_ROOTS="${receiver_root}" CONFIRM_CREATE_DATA=CREATE-DATA \
      "${receiver_bootstrap_command}" "${receiver_args[@]}" --rdp-password-file "${receiver_file}"
    receiver_status=$?
  else
    "${receiver_sudo_command}" env SOLAR_SECRET_ALLOWED_ROOTS="${receiver_root}" CONFIRM_CREATE_DATA=CREATE-DATA \
      "${receiver_bootstrap_command}" "${receiver_args[@]}" --rdp-password-file "${receiver_file}"
    receiver_status=$?
  fi
  set -e
  trap - EXIT
  set +e
  receiver_cleanup "${receiver_status}"
  set -e
  if [[ "${receiver_cleanup_result}" != "0" ]]; then
    exit 121
  fi
  if [[ "${receiver_status}" != "0" ]]; then
    printf 'Remote bootstrap failed with status %s after confirmed secret cleanup\n' "${receiver_status}" >&2
    exit 120
  fi
  exit 0
fi
# END SOLAR DEPLOY SECRET RECEIVER

SCRIPT_PATH="$0"
SCRIPT_DIR=""
PROJECT_DIR=""

TARGET="${1:-}"
MODE="update"
DEPLOY_SCOPE=""
INSTALL_DIR="/data/solar-display"
MQTT_HOST="192.168.31.62"
BUNDLE="online"
DESKTOP="xfce-xrdp"
RDP_AUTH="passwordless"
KIOSK_USER=""
DRY_RUN=0
SKIP_DISK=0
APPLY_READONLY=0
CREATE_DATA_PARTITION=0
ROOT_SIZE_GB=""
DATA_SIZE_GB="10"
MQTT_HOST_EXPLICIT=0
DATA_SIZE_GB_EXPLICIT=0
HOTSPOT_CONNECTION_ID=""
HOTSPOT_SCAN_SSID=""
HOTSPOT_PRIORITY="100"

ssh_password_fd=""
sudo_password_fd=""
rdp_password_fd=""
ssh_password_fd_set=0
sudo_password_fd_set=0
rdp_password_fd_set=0
legacy_sudo_password=""
legacy_sudo_password_set=0
legacy_rdp_password=""
legacy_rdp_password_set=0
resolved_ssh_password=""
resolved_ssh_password_set=0
resolved_sudo_password=""
resolved_sudo_password_set=0
resolved_rdp_password=""
resolved_rdp_password_set=0
explicit_empty_sudo_password=0
explicit_empty_rdp_password=0
export -n ssh_password_fd sudo_password_fd rdp_password_fd \
  legacy_sudo_password legacy_rdp_password resolved_ssh_password resolved_sudo_password \
  resolved_rdp_password secret_fd_value 2>/dev/null || true

usage() {
  cat <<EOF
Usage: scripts/raspi-onekey-deploy.sh <user@host> [options]

Options:
  --mode init|update
  --scope app|full
  --install-dir <path>
  --mqtt-host <host>
  --bundle online|offline
  --desktop xfce-xrdp|none
  --rdp-auth passwordless|system-password
  --ssh-password-fd <fd>
  --sudo-password-fd <fd>
  --rdp-password-fd <fd>
  --rdp-password <password>
  --sudo-password <password>
  --kiosk-user <user>
  --hotspot-connection-id <name>
  --hotspot-scan-ssid <ssid>
  --hotspot-priority <integer>
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

validate_secret_value() {
  local source_name="$1"
  local secret_value="$2"
  LC_ALL=C
  (( ${#secret_value} <= 4096 )) || fail "${source_name} is overlong (maximum 4096 bytes)"
  [[ "${secret_value}" != *$'\r'* && "${secret_value}" != *$'\n'* ]] \
    || fail "${source_name} contains a forbidden byte"
}

secret_fd_value=""
read_secret_fd_once() {
  local source_fd="$1"
  local read_status

  secret_fd_value=""
  [[ "${source_fd}" =~ ^[0-9]+$ ]] || return 1
  if ! { : <&"${source_fd}"; } 2>/dev/null; then
    return 1
  fi

  if IFS= read -r -d '' -n 4097 secret_fd_value <&"${source_fd}"; then
    read_status=0
  else
    read_status=$?
  fi
  exec {source_fd}<&- || return 1
  (( read_status != 0 )) || return 1
  validate_secret_value "password FD" "${secret_fd_value}"
}

scrub_secret_environment() {
  export -n SSH_PASSWORD SUDO_PASSWORD RDP_PASSWORD SSHPASS 2>/dev/null || true
  unset SSH_PASSWORD SUDO_PASSWORD RDP_PASSWORD SSHPASS 2>/dev/null || true
}

capture_secret_sources() {
  local ssh_env_value="${SSH_PASSWORD-}"
  local sudo_env_value="${SUDO_PASSWORD-}"
  local rdp_env_value="${RDP_PASSWORD-}"

  scrub_secret_environment

  if [[ "${ssh_password_fd_set}" == "1" && "${sudo_password_fd_set}" == "1" && "${ssh_password_fd}" == "${sudo_password_fd}" ]] \
    || [[ "${ssh_password_fd_set}" == "1" && "${rdp_password_fd_set}" == "1" && "${ssh_password_fd}" == "${rdp_password_fd}" ]] \
    || [[ "${sudo_password_fd_set}" == "1" && "${rdp_password_fd_set}" == "1" && "${sudo_password_fd}" == "${rdp_password_fd}" ]]; then
    fail "password FD sources must not alias a consumed descriptor"
  fi

  if [[ "${ssh_password_fd_set}" == "1" ]]; then
    read_secret_fd_once "${ssh_password_fd}" || fail "--ssh-password-fd could not be read safely"
    if [[ -n "${secret_fd_value}" ]]; then
      resolved_ssh_password="${secret_fd_value}"
      resolved_ssh_password_set=1
    fi
  fi
  if [[ "${resolved_ssh_password_set}" == "0" && -n "${ssh_env_value}" ]]; then
    validate_secret_value "SSH_PASSWORD" "${ssh_env_value}"
    resolved_ssh_password="${ssh_env_value}"
    resolved_ssh_password_set=1
  fi

  if [[ "${sudo_password_fd_set}" == "1" ]]; then
    read_secret_fd_once "${sudo_password_fd}" || fail "--sudo-password-fd could not be read safely"
    if [[ -n "${secret_fd_value}" ]]; then
      resolved_sudo_password="${secret_fd_value}"
      resolved_sudo_password_set=1
    fi
  fi
  if [[ "${resolved_sudo_password_set}" == "0" && "${legacy_sudo_password_set}" == "1" ]]; then
    validate_secret_value "--sudo-password" "${legacy_sudo_password}"
    if [[ -n "${legacy_sudo_password}" ]]; then
      resolved_sudo_password="${legacy_sudo_password}"
      resolved_sudo_password_set=1
    else
      explicit_empty_sudo_password=1
    fi
  elif [[ "${resolved_sudo_password_set}" == "0" && "${legacy_sudo_password_set}" == "0" && -n "${sudo_env_value}" ]]; then
    validate_secret_value "SUDO_PASSWORD" "${sudo_env_value}"
    resolved_sudo_password="${sudo_env_value}"
    resolved_sudo_password_set=1
  elif [[ "${resolved_sudo_password_set}" == "0" && "${legacy_sudo_password_set}" == "0" && "${resolved_ssh_password_set}" == "1" ]]; then
    resolved_sudo_password="${resolved_ssh_password}"
    resolved_sudo_password_set=1
  fi

  if [[ "${rdp_password_fd_set}" == "1" ]]; then
    read_secret_fd_once "${rdp_password_fd}" || fail "--rdp-password-fd could not be read safely"
    if [[ -n "${secret_fd_value}" ]]; then
      resolved_rdp_password="${secret_fd_value}"
      resolved_rdp_password_set=1
    fi
  fi
  if [[ "${resolved_rdp_password_set}" == "0" && "${legacy_rdp_password_set}" == "1" ]]; then
    validate_secret_value "--rdp-password" "${legacy_rdp_password}"
    if [[ -n "${legacy_rdp_password}" ]]; then
      resolved_rdp_password="${legacy_rdp_password}"
      resolved_rdp_password_set=1
    else
      explicit_empty_rdp_password=1
    fi
  elif [[ "${resolved_rdp_password_set}" == "0" && "${legacy_rdp_password_set}" == "0" && -n "${rdp_env_value}" ]]; then
    validate_secret_value "RDP_PASSWORD" "${rdp_env_value}"
    resolved_rdp_password="${rdp_env_value}"
    resolved_rdp_password_set=1
  fi

  [[ "${explicit_empty_sudo_password}" == "0" ]] || fail "explicit --sudo-password value is empty; required sudo authentication cannot fall back"
}

emit_secret_frame() {
  local sudo_value="${resolved_sudo_password-}"
  local rdp_value="${resolved_rdp_password-}"
  local sudo_length="${#sudo_value}"
  local rdp_length="${#rdp_value}"

  printf 'SOLAR-DEPLOY-SECRET-FRAME/1\n'
  printf '%s\n' "${sudo_length}"
  printf '%s\n' "${sudo_value}"
  printf '%s\n' "${rdp_length}"
  printf '%s\n' "${rdp_value}"
  printf 'END\n'
}

# BEGIN SOLAR SSH AUTH RUNNERS
run_ssh() {
  local auth_fd
  local ssh_status
  if [[ "${resolved_ssh_password_set}" == "1" ]]; then
    exec {auth_fd}< <(printf '%s' "${resolved_ssh_password}")
    set +e
    sshpass -d "${auth_fd}" ssh "${ssh_options[@]}" "${TARGET}" "$@"
    ssh_status=$?
    set -e
    exec {auth_fd}<&-
    return "${ssh_status}"
  fi
  ssh "${ssh_options[@]}" "${TARGET}" "$@"
}

run_rsync() {
  local auth_fd
  local rsync_status
  if [[ "${resolved_ssh_password_set}" == "1" ]]; then
    exec {auth_fd}< <(printf '%s' "${resolved_ssh_password}")
    set +e
    rsync -az --delete -e "sshpass -d ${auth_fd} ssh ${rsync_ssh_options}" "$@"
    rsync_status=$?
    set -e
    exec {auth_fd}<&-
    return "${rsync_status}"
  fi
  rsync -az --delete -e "ssh ${rsync_ssh_options}" "$@"
}
# END SOLAR SSH AUTH RUNNERS

load_first_boot_deploy_env() {
  [[ "${MODE}" == "init" ]] || return 0
  if [[ "${MQTT_HOST_EXPLICIT}" == "1" && "${DATA_SIZE_GB_EXPLICIT}" == "1" ]]; then
    return 0
  fi

  remote_env="$(run_ssh "if [ -r /boot/firmware/solar-deploy.env ]; then sed -n -E '/^(DATA_SIZE_GB|MQTT_HOST)=/p' /boot/firmware/solar-deploy.env; fi")"
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

dry_run_requested=0
scan_arg_index=1
while (( scan_arg_index <= $# )); do
  scan_option="${!scan_arg_index}"
  case "${scan_option}" in
    --dry-run)
      dry_run_requested=1
      scan_arg_index=$((scan_arg_index + 1))
      ;;
    --mode|--scope|--install-dir|--mqtt-host|--bundle|--desktop|--rdp-auth|\
    --ssh-password-fd|--sudo-password-fd|--rdp-password-fd|--rdp-password|\
    --sudo-password|--kiosk-user|--hotspot-connection-id|--hotspot-scan-ssid|\
    --hotspot-priority|--root-size-gb|--data-size-gb)
      scan_arg_index=$((scan_arg_index + 2))
      ;;
    *)
      scan_arg_index=$((scan_arg_index + 1))
      ;;
  esac
done

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --scope)
      DEPLOY_SCOPE="${2:-}"
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
    --ssh-password-fd)
      ssh_password_fd="${2:-}"
      ssh_password_fd_set=1
      shift 2
      ;;
    --sudo-password-fd)
      sudo_password_fd="${2:-}"
      sudo_password_fd_set=1
      shift 2
      ;;
    --rdp-password-fd)
      rdp_password_fd="${2:-}"
      rdp_password_fd_set=1
      shift 2
      ;;
    --rdp-password)
      echo "WARNING: --rdp-password is deprecated; use --rdp-password-fd. Parent invocation argv is not retroactively protected." >&2
      if [[ "${dry_run_requested}" == "0" ]]; then
        legacy_rdp_password="${2:-}"
      fi
      legacy_rdp_password_set=1
      shift 2
      ;;
    --sudo-password)
      echo "WARNING: --sudo-password is deprecated; use --sudo-password-fd. Parent invocation argv is not retroactively protected." >&2
      if [[ "${dry_run_requested}" == "0" ]]; then
        legacy_sudo_password="${2:-}"
      fi
      legacy_sudo_password_set=1
      shift 2
      ;;
    --kiosk-user)
      KIOSK_USER="${2:-}"
      shift 2
      ;;
    --hotspot-connection-id)
      HOTSPOT_CONNECTION_ID="${2:-}"
      shift 2
      ;;
    --hotspot-scan-ssid)
      HOTSPOT_SCAN_SSID="${2:-}"
      shift 2
      ;;
    --hotspot-priority)
      HOTSPOT_PRIORITY="${2:-}"
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
if [[ -z "${DEPLOY_SCOPE}" ]]; then
  if [[ "${MODE}" == "init" ]]; then
    DEPLOY_SCOPE="full"
  else
    DEPLOY_SCOPE="app"
  fi
fi
[[ "${DEPLOY_SCOPE}" == "app" || "${DEPLOY_SCOPE}" == "full" ]] || fail "--scope must be app or full"
if [[ "${DEPLOY_SCOPE}" == "app" ]]; then
  [[ "${MODE}" == "update" ]] || fail "--mode init requires --scope full"
  [[ "${APPLY_READONLY}" == "0" ]] || fail "--apply-readonly requires --scope full"
  [[ "${CREATE_DATA_PARTITION}" == "0" ]] || fail "--create-data-partition requires --scope full"
  [[ -z "${ROOT_SIZE_GB}" ]] || fail "--root-size-gb requires --scope full"
  [[ -z "${HOTSPOT_CONNECTION_ID}" && -z "${HOTSPOT_SCAN_SSID}" ]] || fail "hotspot options require --scope full"
fi
[[ "${BUNDLE}" == "online" || "${BUNDLE}" == "offline" ]] || fail "--bundle must be online or offline"
[[ "${DESKTOP}" == "xfce-xrdp" || "${DESKTOP}" == "none" ]] || fail "--desktop must be xfce-xrdp or none"
[[ "${RDP_AUTH}" == "passwordless" || "${RDP_AUTH}" == "system-password" ]] || fail "--rdp-auth must be passwordless or system-password"
[[ "${HOTSPOT_PRIORITY}" =~ ^-?[0-9]+$ ]] || fail "--hotspot-priority must be an integer"
if [[ -n "${HOTSPOT_CONNECTION_ID}" && -z "${HOTSPOT_SCAN_SSID}" ]]; then
  HOTSPOT_SCAN_SSID="${HOTSPOT_CONNECTION_ID}"
elif [[ -z "${HOTSPOT_CONNECTION_ID}" && -n "${HOTSPOT_SCAN_SSID}" ]]; then
  fail "--hotspot-scan-ssid requires --hotspot-connection-id"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  scrub_secret_environment
else
  capture_secret_sources
  SCRIPT_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd)"
  PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

if [[ -z "${KIOSK_USER}" ]]; then
  if [[ "${TARGET}" == *@* ]]; then
    KIOSK_USER="${TARGET%@*}"
  else
    KIOSK_USER="pi"
  fi
fi
[[ "${KIOSK_USER}" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || fail "--kiosk-user must be a simple local account name"

readonly_label="dry-run"
if [[ "${APPLY_READONLY}" == "1" ]]; then
  readonly_label="apply"
fi

hotspot_connection_label="disabled"
hotspot_scan_label="n/a"
if [[ -n "${HOTSPOT_CONNECTION_ID}" ]]; then
  hotspot_connection_label="${HOTSPOT_CONNECTION_ID}"
  hotspot_scan_label="${HOTSPOT_SCAN_SSID}"
fi

printf '%s\n' \
  "Solar Display Raspberry Pi deploy" \
  "Target: ${TARGET}" \
  "Mode: ${MODE}" \
  "Scope: ${DEPLOY_SCOPE}" \
  "Install dir: ${INSTALL_DIR}" \
  "MQTT host: ${MQTT_HOST}" \
  "Bundle: ${BUNDLE}" \
  "Desktop: ${DESKTOP}" \
  "RDP auth: ${RDP_AUTH}" \
  "Kiosk user: ${KIOSK_USER}" \
  "Readonly root: ${readonly_label}" \
  "Hotspot connection: ${hotspot_connection_label}" \
  "Hotspot scan SSID: ${hotspot_scan_label}" \
  "Hotspot priority: ${HOTSPOT_PRIORITY}"

if [[ "${DRY_RUN}" == "1" ]]; then
  if [[ "${DEPLOY_SCOPE}" == "app" ]]; then
    printf '%s\n' \
      "Dry run stages:" \
      "OK: would verify SSH reachability and sudo access" \
      "OK: would build ${BUNDLE} bundle" \
      "OK: would upload bundle to target staging directory" \
      "OK: would run remote bootstrap" \
      "OK: would update application files only" \
      "OK: would stop the active service and create a verified runtime backup before replacing application files" \
      "OK: backup verification failure would stop the update before application replacement" \
      "OK: would install production dependencies, restart the existing solar-display.service, and verify release manifest, service, and /health" \
      "OK: would report backup path and recovery command on completion or health failure (no automatic production DB rollback)" \
      "OK: would not run apt, desktop, kiosk, boot, hotspot, readonly, or reboot actions" \
      "OK: dry-run does not upload a bundle, create a backup, install dependencies, or restart services"
    exit 0
  fi
  printf '%s\n' \
    "Dry run stages:" \
    "OK: would run full host deployment" \
    "OK: would verify SSH reachability and sudo access" \
    "OK: would build ${BUNDLE} bundle" \
    "OK: would upload bundle to target staging directory" \
    "OK: would run remote bootstrap" \
    "OK: remote bootstrap would install the Tailscale CLI and enable/start tailscaled.service before application replacement"
  if [[ -n "${HOTSPOT_CONNECTION_ID}" ]]; then
    printf '%s\n' "OK: would configure the preferred hotspot policy without switching the active Wi-Fi connection"
  fi
  printf '%s\n' \
    "OK: update mode would stop the active service and create a verified runtime backup before replacing application files" \
    "OK: backup verification failure would stop the update before application replacement" \
    "OK: would report backup path and recovery command on completion or health failure (no automatic production DB rollback)" \
    "OK: recovery handoff would include restore drill and explicit overwrite commands" \
    "OK: update mode does not run disk partition, filesystem format, or mount table mutation" \
    "OK: dry-run does not upload a bundle, create a backup, install packages, restart services, edit partitions, or enable readonly root"
  exit 0
fi

if [[ "${DEPLOY_SCOPE}" == "full" && "${RDP_AUTH}" == "passwordless" && "${resolved_rdp_password_set}" == "0" ]]; then
  fail "RDP passwordless requires --rdp-password-fd, --rdp-password, or RDP_PASSWORD; SSH and sudo remain password-protected"
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
ssh_options=(-o StrictHostKeyChecking=accept-new)
rsync_ssh_options="-o StrictHostKeyChecking=accept-new"
if [[ "${resolved_ssh_password_set}" == "1" ]]; then
  command -v sshpass >/dev/null 2>&1 || fail "an SSH password source was selected but sshpass is not installed"
  ssh_options+=(
    -o PreferredAuthentications=password
    -o PubkeyAuthentication=no
    -o IdentitiesOnly=yes
  )
  rsync_ssh_options+=" -o PreferredAuthentications=password -o PubkeyAuthentication=no -o IdentitiesOnly=yes"
fi

echo "[2/5] Checking SSH..."
run_ssh "printf 'OK: ssh reachable on %s\n' \"\$(hostname)\""
load_first_boot_deploy_env

echo "[3/5] Uploading bundle..."
run_ssh "rm -rf '${remote_stage}' && mkdir -p '${remote_stage}'"
run_rsync "${bundle_root}/" "${TARGET}:${remote_stage}/"

remote_args=(
  "--mode" "${MODE}"
  "--scope" "${DEPLOY_SCOPE}"
  "--install-dir" "${INSTALL_DIR}"
  "--mqtt-host" "${MQTT_HOST}"
  "--bundle-dir" "${remote_stage}"
  "--desktop" "${DESKTOP}"
  "--rdp-auth" "${RDP_AUTH}"
  "--kiosk-user" "${KIOSK_USER}"
)
if [[ -n "${HOTSPOT_CONNECTION_ID}" ]]; then
  remote_args+=("--hotspot-connection-id" "${HOTSPOT_CONNECTION_ID}")
  remote_args+=("--hotspot-scan-ssid" "${HOTSPOT_SCAN_SSID}")
  remote_args+=("--hotspot-priority" "${HOTSPOT_PRIORITY}")
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
remote_secret_root="/tmp/solar-display-deploy-secrets-${KIOSK_USER}"
remote_secret_invocation="${$}-${RANDOM}-${RANDOM}-${RANDOM}"
remote_secret_parent="${remote_secret_root}/.solar-deploy-${remote_secret_invocation}"
printf -v quoted_receiver_root '%q' "${remote_secret_root}"
printf -v quoted_invocation '%q' "${remote_secret_invocation}"
receiver_source="$(awk '
  /^# BEGIN SOLAR DEPLOY SECRET RECEIVER$/ { copying=1; next }
  /^# END SOLAR DEPLOY SECRET RECEIVER$/ { copying=0 }
  copying { print }
' "${SCRIPT_PATH}")"
remote_command="SOLAR_SECRET_RECEIVER_ROOT=${quoted_receiver_root}
SOLAR_SECRET_INVOCATION_ID=${quoted_invocation}
SOLAR_DEPLOY_MAIN=0
set --${quoted_args}
${receiver_source}"

remote_cleanup_state="idle"
report_unconfirmed_remote_cleanup() {
  if [[ "${remote_cleanup_state}" == "active" ]]; then
    printf 'RDP secret cleanup: unknown; reconnect and validate owner, marker, type, and containment before removing exact path: %s\n' \
      "${remote_secret_parent}" >&2
    remote_cleanup_state="reported"
  fi
}
trap report_unconfirmed_remote_cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

echo "[4/5] Running remote bootstrap..."
remote_cleanup_state="active"
set +e
bootstrap_output="$(emit_secret_frame | run_ssh "cd '${remote_stage}' && ${remote_command}" 2>&1)"
bootstrap_status=$?
set -e
if [[ -n "${bootstrap_output}" ]]; then
  printf '%s\n' "${bootstrap_output}"
fi
if [[ "${bootstrap_status}" == "0" || "${bootstrap_status}" == "120" ]]; then
  remote_cleanup_state="confirmed"
else
  report_unconfirmed_remote_cleanup
fi
[[ "${bootstrap_status}" == "0" ]] || exit "${bootstrap_status}"

echo "[5/5] Done."
