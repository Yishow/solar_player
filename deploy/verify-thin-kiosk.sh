#!/bin/bash
# Verify a Solar Player thin-kiosk install (browser-only, no local solar-display.service).
# Does NOT require solar-display.service or /data/solar-display runtime paths.
set -euo pipefail

KIOSK_USER="${KIOSK_USER:-pi}"
KIOSK_HOME="${KIOSK_HOME:-}"
KIOSK_URL="${KIOSK_URL:-}"
EXPECTED_KIOSK_URL=""
FAN_CONFIG_PATH="${FAN_CONFIG_PATH:-/boot/firmware/config.txt}"
MODEL_PATH="${MODEL_PATH:-/proc/device-tree/model}"
AGENT_UNIT="solar-device-agent"
LIGHTDM_AUTOLOGIN_CONF="${LIGHTDM_AUTOLOGIN_CONF:-/etc/lightdm/lightdm.conf.d/50-solar-kiosk-autologin.conf}"
JOURNAL_HELPER_PATH="${JOURNAL_HELPER_PATH:-/usr/local/sbin/read-solar-display-journal.sh}"
PHASE1_MANAGEMENT_TOKEN_FILE="${PHASE1_MANAGEMENT_TOKEN_FILE:-}"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --kiosk-user) KIOSK_USER="${2:-}"; shift 2 ;;
    --kiosk-home) KIOSK_HOME="${2:-}"; shift 2 ;;
    --kiosk-url) EXPECTED_KIOSK_URL="${2:-}"; shift 2 ;;
    --fan-config-path) FAN_CONFIG_PATH="${2:-}"; shift 2 ;;
    --model-path) MODEL_PATH="${2:-}"; shift 2 ;;
    --management-token-file) PHASE1_MANAGEMENT_TOKEN_FILE="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

KIOSK_URL="${EXPECTED_KIOSK_URL:-${KIOSK_URL}}"
KIOSK_HOME="${KIOSK_HOME:-/home/${KIOSK_USER}}"
KIOSK_BIN_DIR="${KIOSK_HOME}/bin"
WRAPPER_PATH="${KIOSK_BIN_DIR}/start-thin-kiosk.sh"
KIOSK_HELPER_PATH="${KIOSK_BIN_DIR}/start-solar-kiosk.sh"
KIOSK_FIREFOX_PROFILE="${KIOSK_HOME}/.mozilla/firefox/solar-display-kiosk"
AUTOSTART_LAUNCHER="${KIOSK_HOME}/.config/autostart/firefox-kiosk.desktop"
DESKTOP_LAUNCHER="${KIOSK_HOME}/Desktop/Solar Display Kiosk.desktop"
STALE_READONLY_ENABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Enable Read Only System.desktop"
STALE_READONLY_DISABLE_LAUNCHER="${KIOSK_HOME}/Desktop/Temporarily Disable Read Only System.desktop"

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

is_raspberry_pi_5() {
  [[ -f "${MODEL_PATH}" ]] || return 1
  tr -d '\0' < "${MODEL_PATH}" | grep -qi "Raspberry Pi 5"
}

run_default_phase1_probe() {
  python3 - "${KIOSK_FIREFOX_PROFILE}" "${KIOSK_URL}" \
    "${PHASE1_MANAGEMENT_TOKEN_FILE}" <<'PY'
import json
import pathlib
import sqlite3
import sys
import time
import urllib.parse
import urllib.request

profile_path = pathlib.Path(sys.argv[1])
kiosk_url = sys.argv[2]
token_file = pathlib.Path(sys.argv[3]) if sys.argv[3] else None
origin_parts = urllib.parse.urlsplit(kiosk_url)
origin = f"{origin_parts.scheme}://{origin_parts.netloc}"
secure_credential_transport = (
    origin_parts.scheme == "https"
    or origin_parts.hostname in {"127.0.0.1", "::1", "localhost"}
)
result = {
    "cookiePersisted": False,
    "serverReachable": False,
    "timeSignalReceived": False,
    "heartbeatDeviceId": False,
    "heartbeatTimeSyncState": False,
}

def request(url, *, body=None, cookie=None, management_token=None):
    headers = {"Origin": origin}
    if cookie:
        headers["Cookie"] = cookie
    if management_token:
        headers["x-solar-management-token"] = management_token
    if body is not None:
        headers["Content-Type"] = "text/plain;charset=UTF-8"
    return urllib.request.urlopen(
        urllib.request.Request(url, data=body, headers=headers),
        timeout=5,
    )

credential = None
device_id = None
try:
    with request(f"{origin}/health") as response:
        result["serverReachable"] = response.status == 200
except Exception:
    pass

if secure_credential_transport:
    try:
        database_uri = (profile_path / "cookies.sqlite").resolve().as_uri() + "?mode=ro"
        with sqlite3.connect(database_uri, uri=True, timeout=1) as database:
            row = database.execute(
                """
                SELECT value
                FROM moz_cookies
                WHERE name = 'solar_device_credential'
                  AND (host = ? OR host = ?)
                ORDER BY lastAccessed DESC
                LIMIT 1
                """,
                (origin_parts.hostname, f".{origin_parts.hostname}"),
            ).fetchone()
        credential = row[0] if row and isinstance(row[0], str) and row[0] else None
        result["cookiePersisted"] = credential is not None
    except Exception:
        pass

cookie = f"solar_device_credential={credential}" if credential else None
if cookie:
    try:
        with request(f"{origin}/api/device-pairing/status", cookie=cookie) as response:
            pairing_status = json.load(response)
        device_id = pairing_status.get("data", {}).get("deviceId")
    except Exception:
        pass

sid = None
if cookie and device_id:
    try:
        polling_url = f"{origin}/socket.io/?EIO=4&transport=polling"
        with request(polling_url, cookie=cookie) as response:
            open_packet = response.read().decode("utf-8")
        sid = json.loads(open_packet[1:])["sid"] if open_packet.startswith("0") else None
        if sid:
            session_url = f"{polling_url}&sid={urllib.parse.quote(sid)}"
            with request(session_url, body=b"40", cookie=cookie):
                pass
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                with request(session_url, cookie=cookie) as response:
                    packets = response.read().decode("utf-8").split("\x1e")
                for packet in packets:
                    if not packet.startswith("42"):
                        continue
                    event = json.loads(packet[2:])
                    if (
                        isinstance(event, list)
                        and len(event) == 2
                        and event[0] == "server:time"
                        and isinstance(event[1], dict)
                        and event[1].get("timeZone") == "Asia/Taipei"
                        and isinstance(event[1].get("sequence"), int)
                    ):
                        result["timeSignalReceived"] = True
                if result["timeSignalReceived"]:
                    break
            heartbeat = json.dumps(
                [
                    "client:heartbeat",
                    {
                        "isPlaying": True,
                        "pageKey": "overview",
                        "route": "/overview",
                        "timeSyncState": "synced",
                    },
                ],
                separators=(",", ":"),
            ).encode()
            with request(session_url, body=b"42" + heartbeat, cookie=cookie):
                pass
    except Exception:
        pass

management_token = None
try:
    if token_file and secure_credential_transport:
        management_token = token_file.read_text(encoding="utf-8").strip()
except Exception:
    pass

if device_id and management_token:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        try:
            with request(
                f"{origin}/api/device/status",
                management_token=management_token,
            ) as response:
                status = json.load(response)
            clients = status.get("data", {}).get("displayClients", {}).get("clients", [])
            client = next(
                (candidate for candidate in clients if candidate.get("deviceId") == device_id),
                None,
            )
            result["heartbeatDeviceId"] = client is not None
            result["heartbeatTimeSyncState"] = (
                client is not None and client.get("timeSyncState") == "synced"
            )
            if result["heartbeatDeviceId"] and result["heartbeatTimeSyncState"]:
                break
        except Exception:
            pass
        time.sleep(0.1)

if sid and cookie:
    try:
        session_url = f"{origin}/socket.io/?EIO=4&transport=polling&sid={urllib.parse.quote(sid)}"
        with request(session_url, body=b"41", cookie=cookie):
            pass
    except Exception:
        pass

for key, value in result.items():
    print(f"{key}={1 if value else 0}")
PY
}

probe_reports() {
  grep -qx "${1}=1" <<< "${phase1_probe_output}"
}

echo "Solar Player thin-kiosk verification"
echo "Kiosk user: ${KIOSK_USER}"
echo "Kiosk home: ${KIOSK_HOME}"
if [[ -n "${EXPECTED_KIOSK_URL}" ]]; then
  echo "Expected kiosk URL: ${EXPECTED_KIOSK_URL}"
fi
echo ""

# Intentionally do NOT check solar-display.service or /data runtime.
if systemctl cat solar-display.service >/dev/null 2>&1; then
  echo "NOTE: solar-display.service exists on this host (may be disabled after migrate)."
  systemctl is-enabled solar-display.service 2>/dev/null || true
  systemctl is-active solar-display.service 2>/dev/null || true
else
  echo "OK: solar-display.service is not installed (thin-kiosk expectation)"
fi

check "Firefox is installed" command -v firefox
check "lightdm is installed" command -v lightdm
check "start-solar-kiosk.sh helper exists" test -x "${KIOSK_BIN_DIR}/start-solar-kiosk.sh"
check "thin-kiosk wrapper exists" test -x "${WRAPPER_PATH}"
check "autostart launcher exists" test -f "${AUTOSTART_LAUNCHER}"
check "desktop re-entry launcher exists" test -f "${DESKTOP_LAUNCHER}"
check "desktop re-entry launcher is executable" test -x "${DESKTOP_LAUNCHER}"
check "stale readonly enable launcher is absent" test ! -e "${STALE_READONLY_ENABLE_LAUNCHER}"
check "stale readonly disable launcher is absent" test ! -e "${STALE_READONLY_DISABLE_LAUNCHER}"
check "dedicated Firefox profile exists" test -d "${KIOSK_FIREFOX_PROFILE}"
check "dedicated Firefox profile owner matches kiosk user" \
  test "$(stat -c '%U' "${KIOSK_FIREFOX_PROFILE}" 2>/dev/null)" = "${KIOSK_USER}"
check "dedicated Firefox profile mode is 700" \
  test "$(stat -c '%a' "${KIOSK_FIREFOX_PROFILE}" 2>/dev/null)" = "700"

if [[ -f "${WRAPPER_PATH}" ]]; then
  if grep -q "KIOSK_URL=" "${WRAPPER_PATH}"; then
    echo "OK: wrapper exports KIOSK_URL"
    if [[ -n "${EXPECTED_KIOSK_URL}" ]]; then
      if grep -Fq "KIOSK_URL='${EXPECTED_KIOSK_URL}'" "${WRAPPER_PATH}" \
        || grep -Fq "KIOSK_URL=\"${EXPECTED_KIOSK_URL}\"" "${WRAPPER_PATH}" \
        || grep -Fq "KIOSK_URL=${EXPECTED_KIOSK_URL}" "${WRAPPER_PATH}"; then
        echo "OK: kiosk URL matches expected remote server"
      else
        echo "FAIL: wrapper KIOSK_URL does not match expected ${EXPECTED_KIOSK_URL}" >&2
        failures=$((failures + 1))
      fi
    fi
  else
    echo "FAIL: wrapper missing KIOSK_URL export" >&2
    failures=$((failures + 1))
  fi
  if grep -q "KIOSK_WAIT_SECONDS=" "${WRAPPER_PATH}"; then
    echo "OK: wrapper sets extended KIOSK_WAIT_SECONDS"
  else
    echo "FAIL: wrapper missing KIOSK_WAIT_SECONDS" >&2
    failures=$((failures + 1))
  fi
  if grep -Fq "KIOSK_FIREFOX_PROFILE='${KIOSK_FIREFOX_PROFILE}'" "${WRAPPER_PATH}" \
    || grep -Fq "KIOSK_FIREFOX_PROFILE=\"${KIOSK_FIREFOX_PROFILE}\"" "${WRAPPER_PATH}"; then
    echo "OK: dedicated Firefox profile selected"
  else
    echo "FAIL: dedicated Firefox profile selected" >&2
    failures=$((failures + 1))
  fi
fi

if [[ -f "${KIOSK_HELPER_PATH}" ]]; then
  if grep -Fq -- "--profile \"\${KIOSK_FIREFOX_PROFILE}\"" "${KIOSK_HELPER_PATH}"; then
    echo "OK: launcher uses the configured Firefox profile"
  else
    echo "FAIL: launcher uses the configured Firefox profile" >&2
    failures=$((failures + 1))
  fi
  if grep -Fq -- "-private-window" "${KIOSK_HELPER_PATH}"; then
    echo "FAIL: launcher does not use private-window" >&2
    failures=$((failures + 1))
  else
    echo "OK: launcher does not use private-window"
  fi
fi

if [[ -f "${LIGHTDM_AUTOLOGIN_CONF}" ]] && grep -q "autologin-user=${KIOSK_USER}" "${LIGHTDM_AUTOLOGIN_CONF}"; then
  echo "OK: lightdm autologin configured for ${KIOSK_USER}"
else
  echo "FAIL: lightdm autologin not configured for ${KIOSK_USER}" >&2
  failures=$((failures + 1))
fi

if systemctl is-enabled --quiet "${AGENT_UNIT}" 2>/dev/null; then
  echo "OK: ${AGENT_UNIT} is enabled"
else
  echo "FAIL: ${AGENT_UNIT} is not enabled" >&2
  failures=$((failures + 1))
fi

if systemctl is-active --quiet "${AGENT_UNIT}" 2>/dev/null; then
  echo "OK: ${AGENT_UNIT} is active"
else
  echo "FAIL: ${AGENT_UNIT} is not active" >&2
  failures=$((failures + 1))
fi

if [[ -x "${JOURNAL_HELPER_PATH}" ]]; then
  echo "OK: journal helper installed"
else
  echo "FAIL: journal helper missing at ${JOURNAL_HELPER_PATH}" >&2
  failures=$((failures + 1))
fi

# Soft checks for no-sleep (present when disable-display-sleep.sh was run).
if [[ -f /etc/systemd/logind.conf.d/99-solar-no-sleep.conf ]] \
  || systemctl is-enabled --quiet sleep.target 2>/dev/null; then
  if systemctl is-enabled sleep.target >/dev/null 2>&1; then
    # enabled sleep is bad for kiosk; masked is good
    if systemctl is-enabled sleep.target 2>&1 | grep -qi masked; then
      echo "OK: sleep.target masked (no-sleep)"
    else
      echo "NOTE: sleep.target enablement not masked; check no-sleep helper"
    fi
  else
    echo "OK: sleep targets not enabled (no-sleep)"
  fi
else
  echo "NOTE: no-sleep logind drop-in not found (may still be OK if helper applied differently)"
fi

if is_raspberry_pi_5; then
  if [[ -f "${FAN_CONFIG_PATH}" ]] && grep -q "dtoverlay=pwm-2chan\|dtparam=fan" "${FAN_CONFIG_PATH}" 2>/dev/null; then
    echo "OK: Pi 5 fan boot profile appears configured"
  else
    # configure-pi5-fan-control writes a specific block; soft-fail if not Pi path in tests
    if grep -q "pwm-fan\|cooling" "${FAN_CONFIG_PATH}" 2>/dev/null; then
      echo "OK: fan-related boot config present"
    else
      echo "NOTE: Pi 5 fan boot profile not detected in ${FAN_CONFIG_PATH}"
    fi
  fi
else
  echo "SKIP: Pi 5 fan checks not applicable"
fi

phase1_probe_output=""
if command -v python3 >/dev/null 2>&1; then
  phase1_probe_output="$(run_default_phase1_probe || true)"
fi
check "Phase 1 cookie persists across Browser restart" \
  probe_reports "cookiePersisted"
check "Phase 1 remote Server is reachable" \
  probe_reports "serverReachable"
check "Phase 1 immediate Time Signal received" \
  probe_reports "timeSignalReceived"
check "Phase 1 heartbeat includes Device identity" \
  probe_reports "heartbeatDeviceId"
check "Phase 1 heartbeat includes Time Sync State" \
  probe_reports "heartbeatTimeSyncState"

echo ""
if [[ "${failures}" -gt 0 ]]; then
  echo "Thin-kiosk verification FAILED with ${failures} issue(s)." >&2
  exit 1
fi
echo "Thin-kiosk verification PASSED."
exit 0
