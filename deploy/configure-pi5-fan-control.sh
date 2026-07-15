#!/bin/bash
set -euo pipefail

MODEL_PATH="/proc/device-tree/model"
CONFIG_PATH="/boot/firmware/config.txt"
BEGIN_MARKER="# BEGIN Solar Player Pi 5 fan control"
END_MARKER="# END Solar Player Pi 5 fan control"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --model-path) MODEL_PATH="${2:-}"; shift 2 ;;
    --config-path) CONFIG_PATH="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -r "${MODEL_PATH}" ]]; then
  echo "Pi 5 fan control not applicable: model unavailable at ${MODEL_PATH}"
  exit 0
fi

model="$(tr -d '\0' < "${MODEL_PATH}")"
if [[ "${model}" != *"Raspberry Pi 5"* ]]; then
  echo "Pi 5 fan control not applicable: ${model}"
  exit 0
fi

if [[ ! -f "${CONFIG_PATH}" || ! -r "${CONFIG_PATH}" || ! -w "${CONFIG_PATH}" ]]; then
  echo "Unable to update Pi 5 fan boot config: ${CONFIG_PATH}" >&2
  exit 1
fi

begin_count="$(grep -Fxc "${BEGIN_MARKER}" "${CONFIG_PATH}" || true)"
end_count="$(grep -Fxc "${END_MARKER}" "${CONFIG_PATH}" || true)"
if [[ "${begin_count}" != "${end_count}" ]]; then
  echo "Invalid Pi 5 fan managed block in ${CONFIG_PATH}: marker count mismatch" >&2
  exit 1
fi

tmp_path="$(mktemp "${CONFIG_PATH}.solar-player.XXXXXX")"
cleanup() {
  rm -f "${tmp_path}"
}
trap cleanup EXIT INT TERM HUP

awk -v begin_marker="${BEGIN_MARKER}" -v end_marker="${END_MARKER}" '
  function emit_profile() {
    print begin_marker
    print "dtparam=fan_temp0=0"
    print "dtparam=fan_temp0_hyst=5000"
    print "dtparam=fan_temp0_speed=75"
    print "dtparam=fan_temp1=60000"
    print "dtparam=fan_temp1_hyst=5000"
    print "dtparam=fan_temp1_speed=125"
    print "dtparam=fan_temp2=67500"
    print "dtparam=fan_temp2_hyst=5000"
    print "dtparam=fan_temp2_speed=175"
    print "dtparam=fan_temp3=75000"
    print "dtparam=fan_temp3_hyst=5000"
    print "dtparam=fan_temp3_speed=250"
    print end_marker
    emitted = 1
  }

  $0 == begin_marker { in_managed_block = 1; next }
  $0 == end_marker { in_managed_block = 0; next }
  in_managed_block { next }
  !emitted && $0 ~ /^[[:space:]]*dtoverlay=/ { emit_profile() }
  { print }
  END {
    if (!emitted) {
      emit_profile()
    }
  }
' "${CONFIG_PATH}" > "${tmp_path}"

if cmp -s "${CONFIG_PATH}" "${tmp_path}"; then
  echo "Pi 5 fan profile already configured: ${CONFIG_PATH}"
  exit 0
fi

chmod --reference="${CONFIG_PATH}" "${tmp_path}" 2>/dev/null || chmod "$(stat -f '%Lp' "${CONFIG_PATH}")" "${tmp_path}"
chown --reference="${CONFIG_PATH}" "${tmp_path}" 2>/dev/null || true
mv "${tmp_path}" "${CONFIG_PATH}"
trap - EXIT INT TERM HUP

echo "Configured Pi 5 four-stage fan profile; reboot required: ${CONFIG_PATH}"
