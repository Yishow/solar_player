#!/bin/bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo ./deploy/install-kiosk.sh" >&2
  exit 1
fi

BUNDLE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/data/solar-display}"
KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_GROUP="${KIOSK_GROUP:-${KIOSK_USER}}"
KIOSK_HOME="${KIOSK_HOME:-/home/${KIOSK_USER}}"
KIOSK_BIN_DIR="${KIOSK_HOME}/bin"
KIOSK_AUTOSTART_DIR="${KIOSK_HOME}/.config/autostart"
KIOSK_DESKTOP_DIR="${KIOSK_HOME}/Desktop"
KIOSK_STATE_DIR="${KIOSK_HOME}/.local/state/solar-display"
GDM_CUSTOM_CONF="${GDM_CUSTOM_CONF:-/etc/gdm3/custom.conf}"
SYSTEMD_UNIT_PATH="/etc/systemd/system/solar-display.service"
LAUNCHER_LOG_PATH="${KIOSK_STATE_DIR}/kiosk-launcher.log"
LAUNCHER_NAME="Solar Display Kiosk.desktop"
READONLY_ENABLE_LAUNCHER_NAME="Enable Read Only System.desktop"
READONLY_DISABLE_LAUNCHER_NAME="Temporarily Disable Read Only System.desktop"
DEFAULT_AUTOLOGIN_ENABLE_LINE="AutomaticLoginEnable=True"
DEFAULT_AUTOLOGIN_USER_LINE="AutomaticLogin=pi"
NVM_SH_PATH="${NVM_SH_PATH:-${KIOSK_HOME}/.nvm/nvm.sh}"
NODE_BIN="${NODE_BIN:-}"
PNPM_BIN="${PNPM_BIN:-}"

if ! id "${KIOSK_USER}" >/dev/null 2>&1; then
  echo "User not found: ${KIOSK_USER}" >&2
  exit 1
fi

ensure_dir() {
  install -d -m "$1" -o "$2" -g "$3" "$4"
}

resolve_user_bin() {
  local binary_name="$1"
  su - "${KIOSK_USER}" -c "bash -lc 'if [[ -s \"${NVM_SH_PATH}\" ]]; then . \"${NVM_SH_PATH}\"; fi; command -v ${binary_name}'"
}

set_ini_key() {
  local file="$1"
  local section="$2"
  local key="$3"
  local value="$4"
  local tmp

  tmp="$(mktemp)"

  awk -v section="${section}" -v key="${key}" -v value="${value}" '
    BEGIN {
      in_section = 0
      section_found = 0
      key_written = 0
    }
    {
      if ($0 ~ /^\[/) {
        if (in_section && !key_written) {
          print key "=" value
          key_written = 1
        }

        if ($0 == "[" section "]") {
          in_section = 1
          section_found = 1
        } else {
          in_section = 0
        }

        print
        next
      }

      if (in_section && $0 ~ ("^" key "=")) {
        if (!key_written) {
          print key "=" value
          key_written = 1
        }
        next
      }

      print
    }
    END {
      if (!section_found) {
        print "[" section "]"
        print key "=" value
      } else if (in_section && !key_written) {
        print key "=" value
      }
    }
  ' "${file}" > "${tmp}"

  cat "${tmp}" > "${file}"
  rm -f "${tmp}"
}

echo "[1/6] Ensuring runtime directories..."
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${INSTALL_DIR}/data"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${INSTALL_DIR}/logs"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${INSTALL_DIR}/uploads/images"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${INSTALL_DIR}/uploads/brand"

echo "[2/6] Resolving node and pnpm..."
if [[ -z "${NODE_BIN}" ]]; then
  NODE_BIN="$(resolve_user_bin node)"
fi
if [[ -z "${PNPM_BIN}" ]]; then
  PNPM_BIN="$(resolve_user_bin pnpm)"
fi

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  echo "Unable to resolve node for ${KIOSK_USER}. Expected nvm at ${NVM_SH_PATH} or NODE_BIN override." >&2
  exit 1
fi

if [[ -z "${PNPM_BIN}" || ! -x "${PNPM_BIN}" ]]; then
  echo "Unable to resolve pnpm for ${KIOSK_USER}. Expected pnpm via nvm/corepack or PNPM_BIN override." >&2
  exit 1
fi

echo "[3/6] Installing systemd service..."
sed \
  -e "s#^User=.*#User=${KIOSK_USER}#" \
  -e "s#^WorkingDirectory=.*#WorkingDirectory=${INSTALL_DIR}#" \
  -e "s#^EnvironmentFile=.*#EnvironmentFile=-${INSTALL_DIR}/.env#" \
  -e "s#^Environment=DATA_DIR=.*#Environment=DATA_DIR=${INSTALL_DIR}/data#" \
  -e "s#^Environment=LOG_DIR=.*#Environment=LOG_DIR=${INSTALL_DIR}/logs#" \
  -e "s#^Environment=KIOSK_USER=.*#Environment=KIOSK_USER=${KIOSK_USER}#" \
  -e "s#^ExecStart=.*#ExecStart=${NODE_BIN} apps/server/dist/server.js#" \
  -e "s#^ReadWritePaths=.*#ReadWritePaths=${INSTALL_DIR}/data ${INSTALL_DIR}/logs ${INSTALL_DIR}/uploads/images ${INSTALL_DIR}/uploads/brand#" \
  "${BUNDLE_ROOT}/deploy/solar-display.service" > "${SYSTEMD_UNIT_PATH}"

systemctl daemon-reload
systemctl enable solar-display
systemctl restart solar-display

echo "[4/6] Installing kiosk launcher..."
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_BIN_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_AUTOSTART_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_DESKTOP_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_STATE_DIR}"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${BUNDLE_ROOT}/deploy/start-solar-kiosk.sh" \
  "${KIOSK_BIN_DIR}/start-solar-kiosk.sh"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${BUNDLE_ROOT}/deploy/stop-solar-kiosk.sh" \
  "${KIOSK_BIN_DIR}/stop-solar-kiosk.sh"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${BUNDLE_ROOT}/deploy/readonly-system-enable.sh" \
  "${KIOSK_BIN_DIR}/readonly-system-enable.sh"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${BUNDLE_ROOT}/deploy/readonly-system-disable.sh" \
  "${KIOSK_BIN_DIR}/readonly-system-disable.sh"
rendered_launcher="$(mktemp)"
sed \
  -e "s#^Exec=.*#Exec=${KIOSK_BIN_DIR}/start-solar-kiosk.sh#" \
  "${BUNDLE_ROOT}/deploy/firefox-kiosk.desktop" > "${rendered_launcher}"
install -m 644 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_launcher}" \
  "${KIOSK_AUTOSTART_DIR}/firefox-kiosk.desktop"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_launcher}" \
  "${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}"
rm -f "${rendered_launcher}"
chmod +x "${KIOSK_DESKTOP_DIR}/Solar Display Kiosk.desktop"
rendered_readonly_enable="$(mktemp)"
sed \
  -e "s#^Exec=.*#Exec=${KIOSK_BIN_DIR}/readonly-system-enable.sh#" \
  "${BUNDLE_ROOT}/deploy/enable-readonly-system.desktop" > "${rendered_readonly_enable}"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_readonly_enable}" \
  "${KIOSK_DESKTOP_DIR}/${READONLY_ENABLE_LAUNCHER_NAME}"
rm -f "${rendered_readonly_enable}"
rendered_readonly_disable="$(mktemp)"
sed \
  -e "s#^Exec=.*#Exec=${KIOSK_BIN_DIR}/readonly-system-disable.sh#" \
  "${BUNDLE_ROOT}/deploy/disable-readonly-system.desktop" > "${rendered_readonly_disable}"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_readonly_disable}" \
  "${KIOSK_DESKTOP_DIR}/${READONLY_DISABLE_LAUNCHER_NAME}"
rm -f "${rendered_readonly_disable}"
if command -v gio >/dev/null 2>&1; then
  if ! su - "${KIOSK_USER}" -c "gio set '${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}' metadata::trusted true" >/dev/null 2>&1; then
    echo "Warning: unable to set GNOME trusted metadata for ${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}" >&2
  fi
  su - "${KIOSK_USER}" -c "gio set '${KIOSK_DESKTOP_DIR}/${READONLY_ENABLE_LAUNCHER_NAME}' metadata::trusted true" >/dev/null 2>&1 || true
  su - "${KIOSK_USER}" -c "gio set '${KIOSK_DESKTOP_DIR}/${READONLY_DISABLE_LAUNCHER_NAME}' metadata::trusted true" >/dev/null 2>&1 || true
fi

echo "[5/6] Configuring GDM autologin..."
if [[ ! -f "${GDM_CUSTOM_CONF}" ]]; then
  install -D -m 644 /dev/null "${GDM_CUSTOM_CONF}"
fi
cp "${GDM_CUSTOM_CONF}" "${GDM_CUSTOM_CONF}.bak.$(date +%Y%m%d%H%M%S)"
# Defaults this installer enforces on Ubuntu 24.04:
#   AutomaticLoginEnable=True
#   AutomaticLogin=pi
set_ini_key "${GDM_CUSTOM_CONF}" daemon AutomaticLoginEnable True
set_ini_key "${GDM_CUSTOM_CONF}" daemon AutomaticLogin "${KIOSK_USER}"

echo "[6/6] Checking service health..."
systemctl --no-pager --full status solar-display || true

echo "[7/7] Done."
echo ""
echo "Reboot to verify full kiosk boot: sudo reboot"
echo "Server logs: sudo journalctl -u solar-display -b -f"
echo "Kiosk launcher log: ${LAUNCHER_LOG_PATH}"
echo "Resolved node: ${NODE_BIN}"
echo "Resolved pnpm: ${PNPM_BIN}"
echo "Autologin config: ${GDM_CUSTOM_CONF}"
echo "Firefox autostart: ${KIOSK_AUTOSTART_DIR}/firefox-kiosk.desktop"
echo "Desktop launcher: ${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}"
echo "Readonly enable launcher: ${KIOSK_DESKTOP_DIR}/${READONLY_ENABLE_LAUNCHER_NAME}"
echo "Readonly disable launcher: ${KIOSK_DESKTOP_DIR}/${READONLY_DISABLE_LAUNCHER_NAME}"
