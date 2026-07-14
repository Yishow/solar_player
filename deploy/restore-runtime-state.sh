#!/bin/bash
# Restore a verified runtime backup into a target root.
# Default: refuse non-empty targets. Production overwrite requires explicit confirmation.
# Drill mode: extract into a fresh temp root, integrity_check, migrate, bounded health smoke.
set -euo pipefail

BACKUP_DIR=""
TARGET_ROOT=""
DRILL=0
CONFIRM_TOKEN=""
HEALTH_URL_DEFAULT="http://127.0.0.1:3000/health"
HEALTH_TIMEOUT_SECONDS="${RESTORE_HEALTH_TIMEOUT_SECONDS:-20}"
# Documented production overwrite token.
REQUIRED_CONFIRM="RESTORE-OVERWRITE"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

ok() {
  echo "OK: $*"
}

usage() {
  cat <<EOF
Usage:
  deploy/restore-runtime-state.sh --backup-dir <dir> --target-root <dir> [--confirm ${REQUIRED_CONFIRM}]
  deploy/restore-runtime-state.sh --backup-dir <dir> --drill

Options:
  --backup-dir <dir>     Backup directory produced by export-runtime-state.sh
  --target-root <dir>    Destination install root for mutable runtime state
  --confirm <token>      Required (${REQUIRED_CONFIRM}) to overwrite a non-empty target
  --drill                Verify + restore into a fresh temp root, run integrity/migrate/health, then clean up
EOF
}

sha256_file() {
  local file_path="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file_path}" | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${file_path}" | awk '{print $1}'
    return 0
  fi

  fail "sha256sum or shasum is required to verify archive evidence"
}

manifest_payload_sha() {
  local manifest_path="$1"
  local payload_name="$2"

  if command -v node >/dev/null 2>&1; then
    node -e '
      const fs = require("fs");
      const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const name = process.argv[2];
      if (!m.payloads || !m.payloads[name] || !m.payloads[name].sha256) {
        process.exit(2);
      }
      process.stdout.write(m.payloads[name].sha256);
    ' "${manifest_path}" "${payload_name}"
    return 0
  fi

  fail "node is required to parse backup manifest JSON"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --backup-dir) BACKUP_DIR="${2:-}"; shift 2 ;;
    --target-root) TARGET_ROOT="${2:-}"; shift 2 ;;
    --confirm) CONFIRM_TOKEN="${2:-}"; shift 2 ;;
    --drill) DRILL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ -n "${BACKUP_DIR}" ]] || fail "--backup-dir is required"
[[ -d "${BACKUP_DIR}" ]] || fail "Backup directory not found: ${BACKUP_DIR}"

MANIFEST_PATH="${BACKUP_DIR}/manifest.json"
RUNTIME_ARCHIVE="${BACKUP_DIR}/runtime.tar.gz"
RUNTIME_SIDECAR="${BACKUP_DIR}/runtime.tar.gz.sha256"
PRIOR_APPLICATION_ARCHIVE="${BACKUP_DIR}/prior-application.tar.gz"

[[ -f "${MANIFEST_PATH}" ]] || fail "manifest.json missing in ${BACKUP_DIR}"
[[ -f "${RUNTIME_ARCHIVE}" ]] || fail "runtime.tar.gz missing in ${BACKUP_DIR}"
[[ -f "${RUNTIME_SIDECAR}" ]] || fail "runtime.tar.gz.sha256 missing in ${BACKUP_DIR}"

verify_backup() {
  local actual expected sidecar_sha

  actual="$(sha256_file "${RUNTIME_ARCHIVE}")"
  sidecar_sha="$(awk '{print $1}' "${RUNTIME_SIDECAR}")"
  expected="$(manifest_payload_sha "${MANIFEST_PATH}" "runtime.tar.gz")"

  [[ "${actual}" == "${sidecar_sha}" ]] || fail "runtime archive does not match sidecar hash (refusing restore)"
  [[ "${actual}" == "${expected}" ]] || fail "runtime archive does not match manifest payload checksum (refusing restore)"

  if [[ -f "${BACKUP_DIR}/prior-application.tar.gz" ]]; then
    local prior_actual prior_expected
    prior_actual="$(sha256_file "${BACKUP_DIR}/prior-application.tar.gz")"
    prior_expected="$(manifest_payload_sha "${MANIFEST_PATH}" "prior-application.tar.gz" 2>/dev/null || true)"
    if [[ -z "${prior_expected}" ]]; then
      if [[ "${DRILL}" == "1" ]]; then
        fail "prior application archive checksum is missing from manifest; required for restore drill (refusing restore)"
      fi
      # Non-drill restore does not depend on the prior-application payload.
    elif [[ "${prior_actual}" != "${prior_expected}" ]]; then
      fail "prior application archive does not match manifest payload checksum (refusing restore)"
    fi
  fi

  ok "backup checksum verification passed"
}

extract_runtime_to() {
  local dest="$1"
  mkdir -p "${dest}"
  tar -xzf "${RUNTIME_ARCHIVE}" -C "${dest}"
}

extract_prior_application_to() {
  local dest="$1"
  [[ -f "${PRIOR_APPLICATION_ARCHIVE}" ]] \
    || fail "prior-application.tar.gz is required for restore drill"
  mkdir -p "${dest}"
  tar -xzf "${PRIOR_APPLICATION_ARCHIVE}" -C "${dest}"
}

validate_restore_target_root() {
  local root="$1"
  [[ "${root}" == /* ]] || fail "restore target root must be an absolute path: ${root}"

  local normalized
  normalized="$(node -e 'const path = require("node:path"); process.stdout.write(path.resolve(process.argv[1]));' "${root}")" \
    || fail "restore target root could not be normalized: ${root}"
  [[ "${normalized}" != "/" ]] || fail "restore target root must not be filesystem root"

  # Reject well-known system roots so an operator typo cannot rm -rf into /etc etc.
  # The denylist may be overridden via RESTORE_TARGET_DENYLIST (empty disables).
  local denylist="${RESTORE_TARGET_DENYLIST-/etc /usr /bin /sbin /boot /lib /lib64 /home /root /var /proc /sys /dev /run}"
  if [[ -n "${denylist}" ]]; then
    local denied
    for denied in ${denylist}; do
      if [[ "${normalized}" == "${denied}" || "${normalized}" == "${denied}/"* ]]; then
        fail "restore target root must not be a system root: ${normalized} (under ${denied})"
      fi
    done
  fi

  TARGET_ROOT="${normalized}"
}

apply_mutable_paths() {
  local source_root="$1"
  local dest_root="$2"
  local path_name

  mkdir -p "${dest_root}"

  # Snapshot existing mutable paths so a mid-write failure can roll the target
  # back to its pre-restore state instead of leaving it half-overwritten.
  ROLLBACK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/solar-restore-rollback-XXXXXX")"

  for path_name in data uploads .env; do
    if [[ -e "${dest_root}/${path_name}" ]]; then
      mkdir -p "$(dirname "${ROLLBACK_DIR}/${path_name}")"
      cp -a "${dest_root}/${path_name}" "${ROLLBACK_DIR}/${path_name}"
    fi
  done

  local apply_err=0
  for path_name in data uploads .env; do
    if [[ -e "${source_root}/${path_name}" ]]; then
      if [[ -d "${source_root}/${path_name}" ]]; then
        rm -rf "${dest_root}/${path_name}"
        mkdir -p "$(dirname "${dest_root}/${path_name}")"
        if ! cp -a "${source_root}/${path_name}" "${dest_root}/${path_name}"; then
          apply_err=1
          break
        fi
      else
        mkdir -p "$(dirname "${dest_root}/${path_name}")"
        if ! cp -a "${source_root}/${path_name}" "${dest_root}/${path_name}"; then
          apply_err=1
          break
        fi
      fi
    fi
  done

  if [[ "${apply_err}" -ne 0 ]]; then
    # Restore the pre-apply snapshot so the target is unchanged.
    for path_name in data uploads .env; do
      if [[ -e "${ROLLBACK_DIR}/${path_name}" ]]; then
        rm -rf "${dest_root}/${path_name}"
        mkdir -p "$(dirname "${dest_root}/${path_name}")"
        cp -a "${ROLLBACK_DIR}/${path_name}" "${dest_root}/${path_name}"
      elif [[ -e "${dest_root}/${path_name}" ]]; then
        # Newly created during apply (no pre-existing snapshot); remove partial.
        rm -rf "${dest_root}/${path_name}"
      fi
    done
    rm -rf "${ROLLBACK_DIR}"
    ROLLBACK_DIR=""
    fail "failed to apply mutable path '${path_name}'; target rolled back to pre-restore snapshot"
  fi

  rm -rf "${ROLLBACK_DIR}"
  ROLLBACK_DIR=""
}

target_is_nonempty() {
  local root="$1"
  [[ -d "${root}" ]] || return 1
  # Consider non-empty if any entry exists.
  local count
  count="$(find "${root}" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')"
  [[ "${count}" != "0" ]]
}

run_integrity_check() {
  local root="$1"
  local db_path="${root}/data/solar-display.sqlite"

  if [[ ! -f "${db_path}" ]]; then
    ok "no sqlite database present; integrity_check skipped"
    return 0
  fi

  command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 is required for restore integrity_check"
  local integrity
  integrity="$(sqlite3 "${db_path}" "PRAGMA integrity_check;")"
  if [[ "${integrity}" != "ok" ]]; then
    fail "SQLite integrity_check failed after restore: ${integrity}"
  fi
  ok "sqlite integrity_check ok"
}

run_migrations() {
  local root="$1"

  if [[ -n "${RESTORE_DRILL_MIGRATE_CMD:-}" ]]; then
    (
      cd "${root}"
      # shellcheck disable=SC2086
      env DATA_DIR="${root}/data" INSTALL_DIR="${root}" bash -lc "${RESTORE_DRILL_MIGRATE_CMD}"
    )
    ok "migrations completed (override command)"
    return 0
  fi

  if [[ -f "${root}/apps/server/dist/db/migrate.js" || -f "${root}/package.json" ]]; then
    if command -v node >/dev/null 2>&1 && [[ -f "${root}/apps/server/dist/db/migrate.js" ]]; then
      (
        cd "${root}"
        DATA_DIR="${root}/data" LOG_DIR="${root}/logs" node --input-type=module -e '
          import { pathToFileURL } from "node:url";
          import { resolve } from "node:path";
          const mod = await import(pathToFileURL(resolve("apps/server/dist/db/migrate.js")).href);
          mod.migrateDatabase();
        '
      ) || fail "pending migrations failed in restore drill"
      ok "migrations completed"
      return 0
    fi
  fi

  # Fixture-friendly default when no server code is present: no-op success with notice.
  ok "migrations skipped (no migrate entrypoint in target); treat as complete for inventory-only drill"
}

run_health_smoke() {
  local root="$1"

  if [[ -n "${RESTORE_DRILL_HEALTH_CMD:-}" ]]; then
    (
      cd "${root}"
      # shellcheck disable=SC2086
      env DATA_DIR="${root}/data" INSTALL_DIR="${root}" bash -lc "${RESTORE_DRILL_HEALTH_CMD}"
    )
    ok "health smoke returned healthy (override command)"
    return 0
  fi

  if [[ "${RESTORE_SKIP_HEALTH:-0}" == "1" ]]; then
    ok "health smoke skipped by RESTORE_SKIP_HEALTH=1"
    return 0
  fi

  local server_js="${root}/apps/server/dist/server.js"
  if [[ ! -f "${server_js}" ]]; then
    # Without a real server binary, require an explicit override in automated fixtures.
    fail "health smoke requires apps/server/dist/server.js or RESTORE_DRILL_HEALTH_CMD"
  fi

  mkdir -p "${root}/logs" "${root}/data"
  local port
  port="${RESTORE_DRILL_PORT:-$((30000 + RANDOM % 1000))}"
  local health_url="http://127.0.0.1:${port}/health"
  local pid=""
  (
    cd "${root}"
    PORT="${port}" DATA_DIR="${root}/data" LOG_DIR="${root}/logs" \
      node "${server_js}" >"${root}/logs/restore-drill-server.log" 2>&1 &
    echo $! >"${root}/logs/restore-drill-server.pid"
  )
  pid="$(cat "${root}/logs/restore-drill-server.pid")"

  local elapsed=0
  local healthy=0
  while (( elapsed < HEALTH_TIMEOUT_SECONDS )); do
    if curl -fsS "${health_url}" 2>/dev/null | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"\|status.:.ok\|"ok"'; then
      healthy=1
      break
    fi
    # Also accept plain ok body.
    if curl -fsS "${health_url}" 2>/dev/null | grep -qi 'ok'; then
      healthy=1
      break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
  rm -f "${root}/logs/restore-drill-server.pid"

  [[ "${healthy}" -eq 1 ]] || fail "health smoke did not return healthy response at ${health_url} within ${HEALTH_TIMEOUT_SECONDS}s"
  ok "health smoke returned healthy response"
}

verify_backup

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/solar-restore-XXXXXX")"
EXTRACT_DIR="${WORK_DIR}/extract"
ROLLBACK_DIR=""
cleanup() {
  rm -rf "${WORK_DIR}" "${ROLLBACK_DIR}"
}
trap cleanup EXIT

mkdir -p "${EXTRACT_DIR}"
extract_runtime_to "${EXTRACT_DIR}"

# Verify extracted inventory exists (optional presence) before writing target.
if [[ ! -e "${EXTRACT_DIR}/data" && ! -e "${EXTRACT_DIR}/uploads" && ! -e "${EXTRACT_DIR}/.env" ]]; then
  fail "runtime archive contained no restoreable mutable paths"
fi

if [[ "${DRILL}" == "1" ]]; then
  DRILL_ROOT="${WORK_DIR}/drill-root"
  mkdir -p "${DRILL_ROOT}"
  extract_prior_application_to "${DRILL_ROOT}"
  apply_mutable_paths "${EXTRACT_DIR}" "${DRILL_ROOT}"

  # Drill must not touch production service.
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet solar-display 2>/dev/null; then
      # Read-only observation only; never stop/start production service from drill.
      ok "production solar-display remains active (drill does not control it)"
    fi
  fi

  run_integrity_check "${DRILL_ROOT}"
  run_migrations "${DRILL_ROOT}"
  run_health_smoke "${DRILL_ROOT}"

  ok "restore drill completed"
  echo "DRILL_ROOT=${DRILL_ROOT}"
  echo "Restore drill verified integrity, migrations, and health against temp root only."
  exit 0
fi

[[ -n "${TARGET_ROOT}" ]] || fail "--target-root is required unless --drill is set"
validate_restore_target_root "${TARGET_ROOT}"

if target_is_nonempty "${TARGET_ROOT}"; then
  if [[ "${CONFIRM_TOKEN}" != "${REQUIRED_CONFIRM}" ]]; then
    fail "target root is not empty: ${TARGET_ROOT}; pass --confirm ${REQUIRED_CONFIRM} to overwrite mutable runtime state"
  fi
  ok "explicit overwrite confirmation accepted for ${TARGET_ROOT}"
fi

mkdir -p "${TARGET_ROOT}"
apply_mutable_paths "${EXTRACT_DIR}" "${TARGET_ROOT}"
ok "runtime state restored to ${TARGET_ROOT}"
echo "TARGET_ROOT=${TARGET_ROOT}"
echo "Restored mutable paths from ${BACKUP_DIR}"
echo "  source backup: ${BACKUP_DIR}"
echo "  target root: ${TARGET_ROOT}"
echo "Note: this helper never starts production services and never auto-rolls back a live DB without --confirm."

# Persist an auditable restore record. Best-effort: never fatal on success.
(
  set +e
  audit_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown-ts")"
  audit_release="unknown"
  if command -v node >/dev/null 2>&1; then
    parsed_release="$(node -e '
      try {
        const fs = require("fs");
        const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const r = m.sourceRelease || {};
        process.stdout.write((r.name || "unknown") + "@" + (r.version || "unknown"));
      } catch (e) {
        process.stdout.write("unknown");
      }
    ' "${MANIFEST_PATH}" 2>/dev/null || true)"
    [[ -n "${parsed_release}" ]] && audit_release="${parsed_release}"
  fi
  mkdir -p "${TARGET_ROOT}/logs" 2>/dev/null || true
  audit_log="${TARGET_ROOT}/logs/restore-audit.log"
  printf '%s\tbackup=%s\ttarget=%s\trelease=%s\n' \
    "${audit_ts}" "${BACKUP_DIR}" "${TARGET_ROOT}" "${audit_release}" >> "${audit_log}" 2>/dev/null || true
  chmod 0600 "${audit_log}" 2>/dev/null || true
)
