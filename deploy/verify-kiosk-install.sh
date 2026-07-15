#!/bin/bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_HOME="${KIOSK_HOME:-}"
KIOSK_HEALTH_URL="${KIOSK_HEALTH_URL:-http://127.0.0.1:3000/health}"
MODEL_PATH="${MODEL_PATH:-/proc/device-tree/model}"
FAN_CONFIG_PATH="${FAN_CONFIG_PATH:-/boot/firmware/config.txt}"
THERMAL_CLASS_PATH="${THERMAL_CLASS_PATH:-/sys/class/thermal}"
HWMON_CLASS_PATH="${HWMON_CLASS_PATH:-/sys/class/hwmon}"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --install-dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --kiosk-user) KIOSK_USER="${2:-}"; shift 2 ;;
    --kiosk-home) KIOSK_HOME="${2:-}"; shift 2 ;;
    --health-url) KIOSK_HEALTH_URL="${2:-}"; shift 2 ;;
    --model-path) MODEL_PATH="${2:-}"; shift 2 ;;
    --fan-config-path) FAN_CONFIG_PATH="${2:-}"; shift 2 ;;
    --thermal-class-path) THERMAL_CLASS_PATH="${2:-}"; shift 2 ;;
    --hwmon-class-path) HWMON_CLASS_PATH="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

KIOSK_HOME="${KIOSK_HOME:-/home/${KIOSK_USER}}"
AUTOSTART_LAUNCHER="${KIOSK_HOME}/.config/autostart/firefox-kiosk.desktop"
DESKTOP_LAUNCHER="${KIOSK_HOME}/Desktop/Solar Display Kiosk.desktop"
READONLY_ENABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Enable Read Only System.desktop"
READONLY_DISABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Temporarily Disable Read Only System.desktop"

failures=0

check() {
  local label="$1"
  shift

  if "$@"; then
    echo "OK: ${label}"
  else
    echo "FAIL: ${label}" >&2
    failures=$((failures + 1))
  fi
}

health_ready() {
  local attempt
  for attempt in {1..30}; do
    curl -fsS "${KIOSK_HEALTH_URL}" && return 0
    sleep 1
  done
  return 1
}

path_under_install_dir() {
  local path="$1"
  [[ "${path}" == "${INSTALL_DIR}"/* ]]
}

modules_not_hidden_by_copymods() {
  if ! findmnt /usr/lib/modules >/dev/null 2>&1; then
    return 0
  fi

  local source fstype
  source="$(findmnt -no SOURCE /usr/lib/modules)"
  fstype="$(findmnt -no FSTYPE /usr/lib/modules)"
  [[ "${source}" != "copymods" && "${fstype}" != "tmpfs" ]]
}

firefox_snap_uses_noto_cjk() {
  command -v snap >/dev/null 2>&1 || return 0
  snap list firefox >/dev/null 2>&1 || return 0

  local uid
  uid="$(id -u "${KIOSK_USER}")"
  sudo -u "${KIOSK_USER}" XDG_RUNTIME_DIR="/run/user/${uid}" snap run --shell firefox -c 'fc-match sans:lang=zh-tw' | grep -q 'Noto Sans CJK TC'
}

wifi_connected_when_present() {
  command -v nmcli >/dev/null 2>&1 || return 0
  if ! nmcli -t -f TYPE device status | grep -qx 'wifi'; then
    return 0
  fi

  nmcli -t -f TYPE,STATE device status | grep -qx 'wifi:connected'
}

tailscale_active_when_installed() {
  command -v tailscale >/dev/null 2>&1 || return 0
  systemctl is-active --quiet tailscaled
}

fcitx_chewing_configured_when_fcitx_is_installed() {
  command -v fcitx5 >/dev/null 2>&1 || return 0

  dpkg-query -W -f='${Status}' fcitx5-chewing 2>/dev/null | grep -q 'install ok installed' &&
    test -f /usr/share/fcitx5/inputmethod/chewing.conf &&
    grep -q '^Name=chewing$' "${KIOSK_HOME}/.config/fcitx5/profile"
}

display_sleep_autostart_configured() {
  test -x "${KIOSK_HOME}/.local/bin/solar-disable-display-sleep.sh" &&
    test -f "${KIOSK_HOME}/.config/autostart/solar-disable-display-sleep.desktop" &&
    test -f "${KIOSK_HOME}/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-power-manager.xml"
}

system_sleep_targets_masked() {
  local target

  test -f /etc/systemd/logind.conf.d/99-solar-no-sleep.conf || return 1
  grep -q '^IdleAction=ignore$' /etc/systemd/logind.conf.d/99-solar-no-sleep.conf || return 1

  for target in sleep.target suspend.target hibernate.target hybrid-sleep.target; do
    [[ "$(systemctl is-enabled "${target}" 2>/dev/null || true)" == "masked" ]] || return 1
  done
}

display_sleep_disabled_when_x_available() {
  command -v xset >/dev/null 2>&1 || return 0
  [[ -S /tmp/.X11-unix/X0 ]] || return 0

  local uid output
  uid="$(id -u "${KIOSK_USER}")"
  output="$(sudo -u "${KIOSK_USER}" DISPLAY=:0 XDG_RUNTIME_DIR="/run/user/${uid}" xset q 2>/dev/null)" || return 1

  grep -q 'timeout:  0' <<< "${output}" && grep -q 'DPMS is Disabled' <<< "${output}"
}

xfce_user_config_writable_when_installed() {
  command -v xfce4-panel >/dev/null 2>&1 || return 0

  local path
  for path in \
    "${KIOSK_HOME}/.config/xfce4" \
    "${KIOSK_HOME}/.config/xfce4/xfconf" \
    "${KIOSK_HOME}/.config/xfce4/panel"; do
    [[ -d "${path}" ]] || return 1
    sudo -u "${KIOSK_USER}" test -w "${path}" || return 1
  done
}

xfce_panel_running_when_x_available() {
  command -v xfce4-panel >/dev/null 2>&1 || return 0
  [[ -S /tmp/.X11-unix/X0 ]] || return 0

  local pid
  while read -r pid; do
    [[ -n "${pid}" && -r "/proc/${pid}/environ" ]] || continue
    if tr '\0' '\n' < "/proc/${pid}/environ" | grep -qx 'DISPLAY=:0'; then
      return 0
    fi
  done < <(pgrep -u "${KIOSK_USER}" -x xfce4-panel 2>/dev/null || true)

  return 1
}

is_raspberry_pi_5() {
  [[ -r "${MODEL_PATH}" ]] || return 1
  [[ "$(tr -d '\0' < "${MODEL_PATH}")" == *"Raspberry Pi 5"* ]]
}

pi5_fan_boot_profile_configured() {
  [[ -r "${FAN_CONFIG_PATH}" ]] || return 1

  local expected actual begin_line overlay_line
  expected="$(cat <<'EOF'
# BEGIN Solar Player Pi 5 fan control
dtparam=fan_temp0=0
dtparam=fan_temp0_hyst=5000
dtparam=fan_temp0_speed=75
dtparam=fan_temp1=60000
dtparam=fan_temp1_hyst=5000
dtparam=fan_temp1_speed=125
dtparam=fan_temp2=67500
dtparam=fan_temp2_hyst=5000
dtparam=fan_temp2_speed=175
dtparam=fan_temp3=75000
dtparam=fan_temp3_hyst=5000
dtparam=fan_temp3_speed=250
# END Solar Player Pi 5 fan control
EOF
)"
  actual="$(awk '
    $0 == "# BEGIN Solar Player Pi 5 fan control" { capture = 1 }
    capture { print }
    $0 == "# END Solar Player Pi 5 fan control" { capture = 0 }
  ' "${FAN_CONFIG_PATH}")"

  [[ "$(grep -Fxc '# BEGIN Solar Player Pi 5 fan control' "${FAN_CONFIG_PATH}" || true)" == "1" ]] || return 1
  [[ "$(grep -Fxc '# END Solar Player Pi 5 fan control' "${FAN_CONFIG_PATH}" || true)" == "1" ]] || return 1
  [[ "${actual}" == "${expected}" ]] || return 1

  begin_line="$(grep -n -F '# BEGIN Solar Player Pi 5 fan control' "${FAN_CONFIG_PATH}" | cut -d: -f1)"
  overlay_line="$(grep -n -m1 -E '^[[:space:]]*dtoverlay=' "${FAN_CONFIG_PATH}" | cut -d: -f1 || true)"
  [[ -z "${overlay_line}" || "${begin_line}" -lt "${overlay_line}" ]]
}

thermal_zone_has_active_trip_points() {
  local zone_path="$1"
  local expected_temperature trip_path trip_index

  for expected_temperature in 0 60000 67500 75000; do
    local found=0
    for trip_path in "${zone_path}"/trip_point_*_temp; do
      [[ -f "${trip_path}" ]] || continue
      [[ "$(cat "${trip_path}")" == "${expected_temperature}" ]] || continue
      trip_index="${trip_path%_temp}"
      [[ -f "${trip_index}_type" && "$(cat "${trip_index}_type")" == "active" ]] || continue
      found=1
      break
    done
    [[ "${found}" == "1" ]] || return 1
  done
}

pi5_fan_rpm_active() {
  local hwmon_path fan_input rpm

  for hwmon_path in "${HWMON_CLASS_PATH}"/hwmon*; do
    [[ -d "${hwmon_path}" && -f "${hwmon_path}/name" ]] || continue
    [[ "$(cat "${hwmon_path}/name")" == "pwmfan" ]] || continue
    for fan_input in "${hwmon_path}"/fan*_input; do
      [[ -f "${fan_input}" ]] || continue
      rpm="$(cat "${fan_input}")"
      [[ "${rpm}" =~ ^[1-9][0-9]*$ ]] && return 0
    done
  done

  return 1
}

pi5_fan_runtime_contract_active() {
  local cooling_path zone_path cooling_ok=0 thermal_ok=0

  for cooling_path in "${THERMAL_CLASS_PATH}"/cooling_device*; do
    [[ -d "${cooling_path}" ]] || continue
    if [[
      -f "${cooling_path}/type"
      && -f "${cooling_path}/max_state"
      && -f "${cooling_path}/cur_state"
      && "$(cat "${cooling_path}/type")" == "pwm-fan"
      && "$(cat "${cooling_path}/max_state")" == "4"
      && "$(cat "${cooling_path}/cur_state")" =~ ^[1-9][0-9]*$
    ]]; then
      cooling_ok=1
      break
    fi
  done
  [[ "${cooling_ok}" == "1" ]] || return 1

  for zone_path in "${THERMAL_CLASS_PATH}"/thermal_zone*; do
    [[ -d "${zone_path}" ]] || continue
    [[ -f "${zone_path}/mode" && "$(cat "${zone_path}/mode")" == "enabled" ]] || continue
    [[ -f "${zone_path}/policy" && "$(cat "${zone_path}/policy")" == "step_wise" ]] || continue
    if thermal_zone_has_active_trip_points "${zone_path}"; then
      thermal_ok=1
      break
    fi
  done

  [[ "${thermal_ok}" == "1" ]] && pi5_fan_rpm_active
}

check "solar-display service is active" systemctl is-active --quiet solar-display
check "health endpoint responds: ${KIOSK_HEALTH_URL}" health_ready
check "kernel modules are not hidden by cloud-initramfs-copymods tmpfs" modules_not_hidden_by_copymods
check "Firefox snap resolves Traditional Chinese to Noto Sans CJK TC when installed" firefox_snap_uses_noto_cjk
check "Wi-Fi is connected when a Wi-Fi device is present" wifi_connected_when_present
check "tailscaled is active when Tailscale is installed" tailscale_active_when_installed
check "Fcitx5 Chewing is installed and present in the kiosk profile when Fcitx5 is installed" fcitx_chewing_configured_when_fcitx_is_installed
check "display sleep disable autostart is configured" display_sleep_autostart_configured
check "system sleep targets are masked" system_sleep_targets_masked
check "display sleep is disabled when X display is available" display_sleep_disabled_when_x_available
check "XFCE user config directories are writable by ${KIOSK_USER}" xfce_user_config_writable_when_installed
check "XFCE panel is running on display :0 when local X is available" xfce_panel_running_when_x_available
if is_raspberry_pi_5; then
  check "Pi 5 fan boot profile is configured" pi5_fan_boot_profile_configured
  check "Pi 5 fan runtime thermal contract is active" pi5_fan_runtime_contract_active
else
  echo "SKIP: Pi 5 fan thermal checks not applicable"
fi
check "autostart launcher exists: ${AUTOSTART_LAUNCHER}" test -f "${AUTOSTART_LAUNCHER}"
check "desktop re-entry launcher exists: ${DESKTOP_LAUNCHER}" test -f "${DESKTOP_LAUNCHER}"
check "desktop re-entry launcher is executable: ${DESKTOP_LAUNCHER}" test -x "${DESKTOP_LAUNCHER}"
check "readonly enable launcher exists: ${READONLY_ENABLE_LAUNCHER}" test -f "${READONLY_ENABLE_LAUNCHER}"
check "readonly enable launcher is executable: ${READONLY_ENABLE_LAUNCHER}" test -x "${READONLY_ENABLE_LAUNCHER}"
check "readonly disable launcher exists: ${READONLY_DISABLE_LAUNCHER}" test -f "${READONLY_DISABLE_LAUNCHER}"
check "readonly disable launcher is executable: ${READONLY_DISABLE_LAUNCHER}" test -x "${READONLY_DISABLE_LAUNCHER}"

for path in \
  "${INSTALL_DIR}/data" \
  "${INSTALL_DIR}/logs" \
  "${INSTALL_DIR}/uploads/images" \
  "${INSTALL_DIR}/uploads/brand"; do
  check "runtime path exists: ${path}" test -d "${path}"
  check "runtime path is under INSTALL_DIR: ${path}" path_under_install_dir "${path}"
  check "runtime path writable by ${KIOSK_USER}: ${path}" sudo -u "${KIOSK_USER}" test -w "${path}"
done

launcher_exec_line="$(grep '^Exec=' "${DESKTOP_LAUNCHER}" 2>/dev/null || true)"
if [[
  "${launcher_exec_line}" != "Exec=${KIOSK_HOME}/bin/start-solar-kiosk.sh"
  && "${launcher_exec_line}" != "Exec=env KIOSK_DISPLAY_OUTPUT="*" ${KIOSK_HOME}/bin/start-solar-kiosk.sh"
]]; then
  echo "FAIL: Device Status re-entry guidance is not backed by the desktop launcher start helper: ${DESKTOP_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: desktop launcher invokes fixed start helper"
fi

if ! grep -q "Exec=${KIOSK_HOME}/bin/readonly-system-enable.sh" "${READONLY_ENABLE_LAUNCHER}" 2>/dev/null; then
  echo "FAIL: readonly enable launcher does not invoke fixed helper: ${READONLY_ENABLE_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: readonly enable launcher invokes fixed helper"
fi

if ! grep -q "Exec=${KIOSK_HOME}/bin/readonly-system-disable.sh" "${READONLY_DISABLE_LAUNCHER}" 2>/dev/null; then
  echo "FAIL: readonly disable launcher does not invoke fixed helper: ${READONLY_DISABLE_LAUNCHER}" >&2
  failures=$((failures + 1))
else
  echo "OK: readonly disable launcher invokes fixed helper"
fi

if [[ "${failures}" -gt 0 ]]; then
  echo "Kiosk verification failed with ${failures} issue(s)." >&2
  exit 1
fi

echo "Kiosk verification passed for ${INSTALL_DIR}."
