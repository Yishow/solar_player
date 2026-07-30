#!/bin/bash
# Install Solar Player as a browser-only thin kiosk pointing at a remote PC server.
# Does NOT install solar-display.service, node, or pnpm.
# Reuses deploy/start-solar-kiosk.sh with a thin-kiosk-specific Firefox command.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo ./deploy/install-thin-kiosk.sh --kiosk-url http://<PC_IP>:4000/overview" >&2
  exit 1
fi

BUNDLE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KIOSK_URL=""
KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_GROUP=""
MIGRATE=0
CONFIRM_MIGRATE=0
CONFIRM_EXISTING_SERVICE=0
SERVER_ALLOW_IP=""
SKIP_DESKTOP_CHECK=0
DEVICE_AGENT_PORT="${DEVICE_AGENT_PORT:-3001}"
KIOSK_WAIT_SECONDS="${KIOSK_WAIT_SECONDS:-600}"
LIGHTDM_AUTOLOGIN_CONF="/etc/lightdm/lightdm.conf.d/50-solar-kiosk-autologin.conf"
SYSTEMD_UNIT_PATH="/etc/systemd/system/solar-display.service"
JOURNAL_HELPER_SRC="${BUNDLE_ROOT}/deploy/read-solar-display-journal.sh"
JOURNAL_HELPER_PATH="${JOURNAL_HELPER_PATH:-/usr/local/sbin/read-solar-display-journal.sh}"
JOURNAL_SUDOERS_PATH="${JOURNAL_SUDOERS_PATH:-/etc/sudoers.d/solar-display-journal}"
AGENT_SRC="${BUNDLE_ROOT}/deploy/solar-device-agent.py"
AGENT_UNIT_SRC="${BUNDLE_ROOT}/deploy/solar-device-agent.service"
AGENT_INSTALL_DIR="/usr/local/lib/solar-device-agent"
AGENT_UNIT_PATH="/etc/systemd/system/solar-device-agent.service"
AGENT_ENV_DIR="/etc/solar-display"
AGENT_ENV_PATH="${AGENT_ENV_DIR}/device-agent.env"
FAN_CONTROL_HELPER="${BUNDLE_ROOT}/deploy/configure-pi5-fan-control.sh"
NO_SLEEP_HELPER="${BUNDLE_ROOT}/deploy/disable-display-sleep.sh"
LAUNCHER_NAME="Solar Display Kiosk.desktop"

usage() {
  cat <<'EOF'
Usage: install-thin-kiosk.sh --kiosk-url URL [options]

Required:
  --kiosk-url URL          Remote overview URL, e.g. http://192.168.1.10:4000/overview

Options:
  --kiosk-user USER        Kiosk desktop user (default: pi)
  --server-allow-ip IP     PC server IP for device-agent allowlist (required for agent access)
  --migrate                Stop+disable existing solar-display.service (keep files for rollback)
  --confirm-migrate        Explicit confirmation required with --migrate
  --confirm-existing-service  Explicit confirmation when solar-display.service exists (non-migrate)
  --kiosk-wait-seconds N   Health wait for remote server (default: 600)
  --device-agent-port N    device-agent listen port (default: 3001)
  --skip-desktop-check     Skip presence check for XFCE/lightdm/Firefox
  -h, --help               Show this help

Notes:
  - Does NOT install solar-display.service or require node/pnpm.
  - On a fresh Pi, run deploy/configure-lightweight-desktop.sh first for the desktop stack.
  - Thin-kiosk mode requires a writable root; co-located readonly helpers are not installed.
  - PC server should be powered on before or alongside the Pi (extended health wait applied).
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --kiosk-url) KIOSK_URL="${2:-}"; shift 2 ;;
    --kiosk-user) KIOSK_USER="${2:-}"; shift 2 ;;
    --server-allow-ip) SERVER_ALLOW_IP="${2:-}"; shift 2 ;;
    --migrate) MIGRATE=1; shift ;;
    --confirm-migrate) CONFIRM_MIGRATE=1; shift ;;
    --confirm-existing-service) CONFIRM_EXISTING_SERVICE=1; shift ;;
    --kiosk-wait-seconds) KIOSK_WAIT_SECONDS="${2:-}"; shift 2 ;;
    --device-agent-port) DEVICE_AGENT_PORT="${2:-}"; shift 2 ;;
    --skip-desktop-check) SKIP_DESKTOP_CHECK=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${KIOSK_URL}" ]]; then
  echo "Missing required --kiosk-url" >&2
  usage >&2
  exit 1
fi

if [[ ! "${KIOSK_URL}" =~ ^https?:// ]]; then
  echo "Invalid --kiosk-url (must start with http:// or https://): ${KIOSK_URL}" >&2
  exit 1
fi

if ! id "${KIOSK_USER}" >/dev/null 2>&1; then
  echo "User not found: ${KIOSK_USER}" >&2
  exit 1
fi

KIOSK_GROUP="${KIOSK_GROUP:-$(id -gn "${KIOSK_USER}")}"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
if [[ -z "${KIOSK_HOME}" ]]; then
  echo "Unable to resolve home for ${KIOSK_USER}" >&2
  exit 1
fi

KIOSK_BIN_DIR="${KIOSK_HOME}/bin"
KIOSK_AUTOSTART_DIR="${KIOSK_HOME}/.config/autostart"
KIOSK_DESKTOP_DIR="${KIOSK_HOME}/Desktop"
KIOSK_STATE_DIR="${KIOSK_HOME}/.local/state/solar-display"
KIOSK_FIREFOX_PROFILE="${KIOSK_HOME}/.mozilla/firefox/solar-display-kiosk"
LAUNCHER_LOG_PATH="${KIOSK_STATE_DIR}/kiosk-launcher.log"

# Derive health URL from kiosk overview URL (scheme://host:port/health).
KIOSK_HEALTH_URL="$(python3 - <<PY
from urllib.parse import urlparse
u = urlparse("${KIOSK_URL}")
print(f"{u.scheme}://{u.netloc}/health")
PY
)"

# This must run before migrate stops/disables the existing service.
ROOT_SOURCE="$(findmnt -no SOURCE / 2>/dev/null || true)"
if [[ "${ROOT_SOURCE}" == "overlayroot" || "${ROOT_SOURCE}" == "overlay" ]]; then
  echo "ERROR: thin-kiosk install requires a writable root." >&2
  echo "Disable the existing readonly overlay and reboot before retrying." >&2
  exit 1
fi

existing_service=0
if [[ -f "${SYSTEMD_UNIT_PATH}" ]] || systemctl cat solar-display.service >/dev/null 2>&1; then
  existing_service=1
fi

if [[ "${MIGRATE}" == "1" ]]; then
  if [[ "${CONFIRM_MIGRATE}" != "1" ]]; then
    echo "Migration requires explicit confirmation." >&2
    echo "Re-run with --migrate --confirm-migrate after reviewing rollback steps." >&2
    echo "Rollback later: re-enable solar-display.service AND re-run install-kiosk.sh to point kiosk at 127.0.0.1:3000." >&2
    exit 2
  fi
  if [[ "${existing_service}" != "1" ]]; then
    echo "WARNING: --migrate specified but solar-display.service was not found; continuing thin-kiosk install." >&2
  else
    echo "[migrate] Stopping and disabling solar-display.service (unit file retained for rollback)..."
    systemctl stop solar-display.service 2>/dev/null || true
    systemctl disable solar-display.service 2>/dev/null || true
    echo "[migrate] solar-display.service is stopped and disabled. Files under /data/solar-display (if any) are left intact."
  fi
elif [[ "${existing_service}" == "1" ]]; then
  if [[ "${CONFIRM_EXISTING_SERVICE}" != "1" ]]; then
    echo "Detected existing solar-display.service." >&2
    echo "Thin-kiosk install will NOT remove it. Choose one:" >&2
    echo "  1) Migrate: re-run with --migrate --confirm-migrate (stop+disable, keep files)" >&2
    echo "  2) Proceed alongside: re-run with --confirm-existing-service" >&2
    echo "  3) Abort and keep co-located mode" >&2
    exit 2
  fi
  echo "WARNING: proceeding with existing solar-display.service still present (not removed)."
fi

if [[ "${SKIP_DESKTOP_CHECK}" != "1" ]]; then
  missing=()
  command -v firefox >/dev/null 2>&1 || missing+=("firefox")
  command -v lightdm >/dev/null 2>&1 || missing+=("lightdm")
  if [[ "${#missing[@]}" -gt 0 ]]; then
    echo "Desktop stack incomplete (missing: ${missing[*]})." >&2
    echo "On a fresh Pi run first: sudo ${BUNDLE_ROOT}/deploy/configure-lightweight-desktop.sh" >&2
    echo "Or pass --skip-desktop-check if you know the stack is installed." >&2
    exit 1
  fi
fi

if [[ ! -x "${FAN_CONTROL_HELPER}" ]]; then
  echo "Missing executable Pi 5 fan helper: ${FAN_CONTROL_HELPER}" >&2
  exit 1
fi
if [[ ! -f "${AGENT_SRC}" ]]; then
  echo "Missing device-agent source: ${AGENT_SRC}" >&2
  exit 1
fi
if [[ ! -f "${JOURNAL_HELPER_SRC}" ]]; then
  echo "Missing journal helper source: ${JOURNAL_HELPER_SRC}" >&2
  exit 1
fi
if [[ ! -f "${BUNDLE_ROOT}/deploy/start-solar-kiosk.sh" ]]; then
  echo "Missing kiosk launcher: ${BUNDLE_ROOT}/deploy/start-solar-kiosk.sh" >&2
  exit 1
fi

ensure_dir() {
  install -d -m "$1" -o "$2" -g "$3" "$4"
}

echo "[1/7] Configuring Pi 5 fan control..."
"${FAN_CONTROL_HELPER}"

echo "[2/7] Disabling display sleep (no-sleep hardening)..."
if [[ -x "${NO_SLEEP_HELPER}" ]]; then
  "${NO_SLEEP_HELPER}" --user "${KIOSK_USER}" --skip-package-install || \
    "${NO_SLEEP_HELPER}" --user "${KIOSK_USER}" || true
else
  echo "WARNING: no-sleep helper missing; continuing" >&2
fi

echo "[3/7] Installing least-privilege journal reader for device-agent /logs..."
install -d -m 755 /usr/local/sbin
install -m 755 -o root -g root "${JOURNAL_HELPER_SRC}" "${JOURNAL_HELPER_PATH}"
journal_sudoers_tmp="$(mktemp)"
cat > "${journal_sudoers_tmp}" <<EOF
# Managed by deploy/install-thin-kiosk.sh — solar-display journal reader for device-agent
Defaults!${JOURNAL_HELPER_PATH} !requiretty
${KIOSK_USER} ALL=(root) NOPASSWD: ${JOURNAL_HELPER_PATH} recent [0-9]*, ${JOURNAL_HELPER_PATH} export [0-9]*
root ALL=(root) NOPASSWD: ${JOURNAL_HELPER_PATH} recent [0-9]*, ${JOURNAL_HELPER_PATH} export [0-9]*
EOF
if ! visudo -cf "${journal_sudoers_tmp}" >/dev/null; then
  echo "sudoers syntax check failed for solar-display journal drop-in; not installing." >&2
  rm -f "${journal_sudoers_tmp}"
  exit 1
fi
install -m 440 -o root -g root "${journal_sudoers_tmp}" "${JOURNAL_SUDOERS_PATH}"
rm -f "${journal_sudoers_tmp}"

echo "[4/7] Installing device-agent (solar-device-agent)..."
install -d -m 755 "${AGENT_INSTALL_DIR}"
install -m 755 -o root -g root "${AGENT_SRC}" "${AGENT_INSTALL_DIR}/solar-device-agent.py"
install -d -m 755 "${AGENT_ENV_DIR}"
if [[ -n "${SERVER_ALLOW_IP}" ]]; then
  cat > "${AGENT_ENV_PATH}" <<EOF
# Managed by install-thin-kiosk.sh
ALLOWED_SOURCE_IPS=${SERVER_ALLOW_IP}
DEVICE_AGENT_PORT=${DEVICE_AGENT_PORT}
DEVICE_AGENT_HOST=0.0.0.0
JOURNAL_HELPER_PATH=${JOURNAL_HELPER_PATH}
KIOSK_LAUNCHER_LOG=${LAUNCHER_LOG_PATH}
EOF
  chmod 644 "${AGENT_ENV_PATH}"
else
  if [[ ! -f "${AGENT_ENV_PATH}" ]]; then
    cat > "${AGENT_ENV_PATH}" <<EOF
# Managed by install-thin-kiosk.sh — set ALLOWED_SOURCE_IPS to the PC server IP
# Fail-closed: empty allowlist rejects all callers with 403.
ALLOWED_SOURCE_IPS=
DEVICE_AGENT_PORT=${DEVICE_AGENT_PORT}
DEVICE_AGENT_HOST=0.0.0.0
JOURNAL_HELPER_PATH=${JOURNAL_HELPER_PATH}
KIOSK_LAUNCHER_LOG=${LAUNCHER_LOG_PATH}
EOF
    chmod 644 "${AGENT_ENV_PATH}"
  fi
  echo "WARNING: --server-allow-ip not set; device-agent allowlist empty = fail-closed (all 403)."
  echo "         Edit ${AGENT_ENV_PATH} and restart solar-device-agent."
fi
# Render the device-agent unit to drop root: run unprivileged as the kiosk user
# (the solar-display-journal sudoers drop-in grants this user the read-only helper).
rendered_agent_unit="$(mktemp)"
sed -e "s#__KIOSK_USER__#${KIOSK_USER}#g" "${AGENT_UNIT_SRC}" > "${rendered_agent_unit}"
install -m 644 -o root -g root "${rendered_agent_unit}" "${AGENT_UNIT_PATH}"
rm -f "${rendered_agent_unit}"
systemctl daemon-reload
systemctl enable solar-device-agent.service
systemctl restart solar-device-agent.service || \
  echo "WARNING: solar-device-agent failed to start; check journalctl -u solar-device-agent" >&2

echo "[5/7] Installing kiosk launcher with remote URL (no solar-display.service)..."
# Explicitly do not install or enable solar-display.service.
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_BIN_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_AUTOSTART_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_DESKTOP_DIR}"
ensure_dir 755 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_STATE_DIR}"
ensure_dir 700 "${KIOSK_USER}" "${KIOSK_GROUP}" "${KIOSK_FIREFOX_PROFILE}"

# Remove readonly launchers owned by older thin-kiosk installer versions.
rm -f \
  "${KIOSK_BIN_DIR}/readonly-system-enable.sh" \
  "${KIOSK_BIN_DIR}/readonly-system-disable.sh" \
  "${KIOSK_DESKTOP_DIR}/Enable Read Only System.desktop" \
  "${KIOSK_DESKTOP_DIR}/Temporarily Disable Read Only System.desktop"

rendered_kiosk_helper="$(mktemp)"
sed \
  '/^setsid firefox /c\
setsid firefox -kiosk --profile "${KIOSK_FIREFOX_PROFILE}" "${KIOSK_URL}" >> "${LOG_FILE}" 2>\&1 \&' \
  "${BUNDLE_ROOT}/deploy/start-solar-kiosk.sh" > "${rendered_kiosk_helper}"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_kiosk_helper}" \
  "${KIOSK_BIN_DIR}/start-solar-kiosk.sh"
rm -f "${rendered_kiosk_helper}"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${BUNDLE_ROOT}/deploy/stop-solar-kiosk.sh" \
  "${KIOSK_BIN_DIR}/stop-solar-kiosk.sh"

# Wrapper sets KIOSK_URL / health / extended wait without modifying start-solar-kiosk.sh.
WRAPPER_PATH="${KIOSK_BIN_DIR}/start-thin-kiosk.sh"
cat > "${WRAPPER_PATH}" <<EOF
#!/bin/bash
set -euo pipefail
export KIOSK_URL='${KIOSK_URL}'
export KIOSK_HEALTH_URL='${KIOSK_HEALTH_URL}'
export KIOSK_WAIT_SECONDS='${KIOSK_WAIT_SECONDS}'
export KIOSK_FIREFOX_PROFILE='${KIOSK_FIREFOX_PROFILE}'
exec '${KIOSK_BIN_DIR}/start-solar-kiosk.sh'
EOF
chown "${KIOSK_USER}:${KIOSK_GROUP}" "${WRAPPER_PATH}"
chmod 755 "${WRAPPER_PATH}"

rendered_launcher="$(mktemp)"
cat > "${rendered_launcher}" <<EOF
[Desktop Entry]
Type=Application
Name=Solar Display Kiosk
Comment=Launch Solar Display thin kiosk against remote server
TryExec=firefox
Exec=${WRAPPER_PATH}
X-GNOME-Autostart-enabled=true
Terminal=false
EOF
install -m 644 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_launcher}" \
  "${KIOSK_AUTOSTART_DIR}/firefox-kiosk.desktop"
install -m 755 -o "${KIOSK_USER}" -g "${KIOSK_GROUP}" \
  "${rendered_launcher}" \
  "${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}"
rm -f "${rendered_launcher}"

if command -v gio >/dev/null 2>&1; then
  su - "${KIOSK_USER}" -c "gio set '${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}' metadata::trusted true" >/dev/null 2>&1 || true
fi

echo "[6/7] Configuring lightdm autologin for ${KIOSK_USER}..."
install -d -m 755 /etc/lightdm/lightdm.conf.d
cat > "${LIGHTDM_AUTOLOGIN_CONF}" <<EOF
[Seat:*]
autologin-user=${KIOSK_USER}
autologin-user-timeout=0
EOF
chmod 644 "${LIGHTDM_AUTOLOGIN_CONF}"

echo "[7/7] Thin-kiosk install summary..."
echo "Done."
echo ""
echo "Kiosk URL:          ${KIOSK_URL}"
echo "Health URL:         ${KIOSK_HEALTH_URL}"
echo "KIOSK_WAIT_SECONDS: ${KIOSK_WAIT_SECONDS}"
echo "Autostart:          ${KIOSK_AUTOSTART_DIR}/firefox-kiosk.desktop"
echo "Desktop launcher:   ${KIOSK_DESKTOP_DIR}/${LAUNCHER_NAME}"
echo "Wrapper:            ${WRAPPER_PATH}"
echo "Firefox profile:    ${KIOSK_FIREFOX_PROFILE}"
echo "Device agent unit:  solar-device-agent.service"
echo "Device agent env:   ${AGENT_ENV_PATH}"
echo "Journal helper:     ${JOURNAL_HELPER_PATH}"
echo "Journal sudoers:    ${JOURNAL_SUDOERS_PATH}"
echo ""
echo "solar-display.service was NOT installed by this script."
if [[ "${MIGRATE}" == "1" ]]; then
  echo "Migration: solar-display.service stop+disable only (files retained for rollback)."
fi
echo ""
echo "Next:"
echo "  1) Ensure PC server is reachable: curl -fsS ${KIOSK_HEALTH_URL}"
echo "  2) Verify: sudo ${BUNDLE_ROOT}/deploy/verify-thin-kiosk.sh --kiosk-url '${KIOSK_URL}'"
echo "  3) Reboot witness: sudo reboot  (then check Firefox opens ${KIOSK_URL})"
echo ""
echo "PC server DEVICE_AGENT_URL example: http://<Pi_IP>:${DEVICE_AGENT_PORT}"
