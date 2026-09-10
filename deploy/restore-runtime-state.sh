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
HEALTH_RESPONSE_MAX_BYTES=65536
HEALTH_CLEANUP_GRACE_MS=2000
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

INTEGRITY_STATUS="skipped"
MIGRATIONS_STATUS="skipped"
HEALTH_STATUS="skipped"
HEALTH_PROCESS_CLEANUP_STATUS="ok"
DRILL_SUMMARY_EMITTED=0
WORK_DIR=""
ROLLBACK_DIR=""

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "${value}"
}

emit_drill_summary() {
  local status="$1"
  local full_drill="$2"
  local cleanup_status="$3"
  local owned_path="${4:-}"
  printf '{"status":"%s","mode":"full-drill","fullDrill":%s,"phases":[' "${status}" "${full_drill}"
  printf '{"name":"integrity","required":true,"status":"%s"},' "${INTEGRITY_STATUS}"
  printf '{"name":"migrations","required":true,"status":"%s"},' "${MIGRATIONS_STATUS}"
  printf '{"name":"health","required":true,"status":"%s"}' "${HEALTH_STATUS}"
  printf '],"cleanup":{"status":"%s"}' "${cleanup_status}"
  if [[ "${cleanup_status}" == "unknown" && -n "${owned_path}" ]]; then
    printf ',"ownedTempPath":"%s"' "$(json_escape "${owned_path}")"
  fi
  printf '}\n'
}

cleanup() {
  local exit_code=$?
  local cleanup_status="${HEALTH_PROCESS_CLEANUP_STATUS:-ok}"
  local owned_path=""
  set +e

  if [[ -n "${WORK_DIR:-}" ]]; then
    rm -rf -- "${WORK_DIR}"
    if [[ -e "${WORK_DIR}" ]]; then
      cleanup_status="unknown"
      owned_path="${WORK_DIR}"
    fi
  fi
  if [[ -n "${ROLLBACK_DIR:-}" ]]; then
    rm -rf -- "${ROLLBACK_DIR}"
    if [[ -e "${ROLLBACK_DIR}" ]]; then
      cleanup_status="unknown"
      [[ -n "${owned_path}" ]] || owned_path="${ROLLBACK_DIR}"
    fi
  fi

  if [[ "${DRILL}" == "1" && "${exit_code}" -ne 0 && "${DRILL_SUMMARY_EMITTED}" == "0" ]]; then
    emit_drill_summary "failed" "false" "${cleanup_status}" "${owned_path}"
  fi
}
trap cleanup EXIT

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
  INTEGRITY_STATUS="failed"

  if [[ ! -f "${db_path}" ]]; then
    INTEGRITY_STATUS="unavailable"
    echo "ERROR: restored sqlite database is unavailable for integrity_check" >&2
    return 0
  fi

  if ! command -v sqlite3 >/dev/null 2>&1; then
    INTEGRITY_STATUS="unavailable"
    echo "ERROR: sqlite3 is unavailable for restore integrity_check" >&2
    return 0
  fi
  local integrity
  if ! integrity="$(sqlite3 "${db_path}" "PRAGMA integrity_check;" 2>/dev/null)"; then
    echo "ERROR: SQLite integrity_check could not read the restored database" >&2
    return 0
  fi
  if [[ "${integrity}" != "ok" ]]; then
    echo "ERROR: SQLite integrity_check failed after restore" >&2
    return 0
  fi
  INTEGRITY_STATUS="ok"
  ok "sqlite integrity_check ok"
}

run_migrations() {
  local root="$1"
  MIGRATIONS_STATUS="failed"

  if [[ -n "${RESTORE_DRILL_MIGRATE_CMD:-}" ]]; then
    if (
      cd "${root}"
      env DATA_DIR="${root}/data" INSTALL_DIR="${root}" bash -lc "${RESTORE_DRILL_MIGRATE_CMD}"
    ); then
      MIGRATIONS_STATUS="ok"
      ok "migrations completed (override command)"
    else
      echo "ERROR: migration override failed in restore drill" >&2
    fi
    return 0
  fi

  local migrate_js="${root}/apps/server/dist/db/migrate.js"
  if [[ ! -r "${migrate_js}" ]]; then
    MIGRATIONS_STATUS="unavailable"
    echo "ERROR: migration entrypoint is unavailable in restored application" >&2
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    MIGRATIONS_STATUS="unavailable"
    echo "ERROR: node runtime is unavailable for restored migrations" >&2
    return 0
  fi
  if (
    cd "${root}"
    DATA_DIR="${root}/data" LOG_DIR="${root}/logs" node --input-type=module -e '
      import { pathToFileURL } from "node:url";
      import { resolve } from "node:path";
      const mod = await import(pathToFileURL(resolve("apps/server/dist/db/migrate.js")).href);
      if (typeof mod.migrateDatabase !== "function") {
        throw new Error("migrateDatabase export is not callable");
      }
      await Promise.resolve(mod.migrateDatabase());
    '
  ); then
    MIGRATIONS_STATUS="ok"
    ok "migrations completed"
  else
    echo "ERROR: pending migrations failed in restore drill" >&2
  fi
}

run_health_smoke() {
  local root="$1"
  HEALTH_STATUS="failed"
  HEALTH_PROCESS_CLEANUP_STATUS="ok"

  if [[ "${RESTORE_SKIP_HEALTH:-0}" == "1" ]]; then
    HEALTH_STATUS="skipped"
    echo "ERROR: health smoke skipped by RESTORE_SKIP_HEALTH=1; result is not full verification" >&2
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    HEALTH_STATUS="unavailable"
    echo "ERROR: node runtime is unavailable for bounded health supervision" >&2
    return 0
  fi

  local server_js="${root}/apps/server/dist/server.js"
  local health_mode="server"
  if [[ -n "${RESTORE_DRILL_HEALTH_CMD:-}" ]]; then
    health_mode="override"
  elif [[ ! -f "${server_js}" ]]; then
    HEALTH_STATUS="unavailable"
    echo "ERROR: health smoke server entrypoint is unavailable in restored application" >&2
    return 0
  elif ! command -v curl >/dev/null 2>&1; then
    HEALTH_STATUS="unavailable"
    echo "ERROR: curl is unavailable for restored server health smoke" >&2
    return 0
  fi

  mkdir -p "${root}/logs" "${root}/data"
  local port
  port="${RESTORE_DRILL_PORT:-$((30000 + RANDOM % 1000))}"
  local supervisor_rc=0
  set +e
  DRILL_HEALTH_ROOT="${root}" \
    DRILL_HEALTH_MODE="${health_mode}" \
    DRILL_HEALTH_PORT="${port}" \
    DRILL_HEALTH_COMMAND="${RESTORE_DRILL_HEALTH_CMD:-}" \
    DRILL_HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS}" \
    DRILL_HEALTH_MAX_BYTES="${HEALTH_RESPONSE_MAX_BYTES}" \
    DRILL_HEALTH_CLEANUP_GRACE_MS="${HEALTH_CLEANUP_GRACE_MS}" \
    node --input-type=module <<'NODE'
import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = process.env.DRILL_HEALTH_ROOT;
const mode = process.env.DRILL_HEALTH_MODE;
const command = process.env.DRILL_HEALTH_COMMAND ?? "";
const port = Number(process.env.DRILL_HEALTH_PORT);
const timeoutSeconds = Number(process.env.DRILL_HEALTH_TIMEOUT_SECONDS);
const maxBytes = Number(process.env.DRILL_HEALTH_MAX_BYTES);
const cleanupGraceMs = Number(process.env.DRILL_HEALTH_CLEANUP_GRACE_MS);
if (!root || !Number.isFinite(port) || !Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0
  || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isFinite(cleanupGraceMs) || cleanupGraceMs < 0) {
  process.exit(3);
}

const deadline = performance.now() + timeoutSeconds * 1000;
let owned = null;
let ownedExit = Promise.resolve({ code: 0, signal: null });
let ownedReaped = true;
let signalHandling = false;

function remainingMs() {
  return Math.max(0, deadline - performance.now());
}

function groupAlive(pgid) {
  if (!pgid) return false;
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function sendGroupSignal(pgid, signal) {
  try {
    process.kill(-pgid, signal);
    return true;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

function setOwned(child) {
  owned = child;
  ownedReaped = false;
  ownedExit = new Promise((resolveExit) => {
    child.once("exit", (code, signal) => {
      ownedReaped = true;
      resolveExit({ code, signal });
    });
    child.once("error", (error) => {
      ownedReaped = true;
      resolveExit({ code: null, signal: null, error });
    });
  });
  return child;
}

async function terminateOwned() {
  if (!owned?.pid) return "ok";
  const pgid = owned.pid;
  const cleanupDeadline = performance.now() + cleanupGraceMs;
  const killAt = cleanupDeadline - Math.min(100, cleanupGraceMs);
  sendGroupSignal(pgid, "SIGTERM");
  while (groupAlive(pgid) && performance.now() < killAt) {
    await delay(Math.min(25, Math.max(1, killAt - performance.now())));
  }
  if (groupAlive(pgid)) {
    sendGroupSignal(pgid, "SIGKILL");
  }
  while (groupAlive(pgid) && performance.now() < cleanupDeadline) {
    await delay(Math.min(10, Math.max(1, cleanupDeadline - performance.now())));
  }
  const reapRemaining = Math.max(0, cleanupDeadline - performance.now());
  if (!ownedReaped && reapRemaining > 0) {
    await Promise.race([ownedExit, delay(reapRemaining)]);
  }
  return groupAlive(pgid) || !ownedReaped ? "unknown" : "ok";
}

async function finish(kind) {
  const cleanup = await terminateOwned();
  if (kind === "ok" && cleanup === "ok") process.exit(0);
  if (cleanup !== "ok") process.exit(4);
  if (kind === "unavailable") process.exit(2);
  process.exit(3);
}

for (const [signal, code] of [["SIGHUP", 129], ["SIGINT", 130], ["SIGTERM", 143]]) {
  process.on(signal, () => {
    if (signalHandling) return;
    signalHandling = true;
    void terminateOwned().finally(() => process.exit(code));
  });
}

function validHealthBody(body) {
  if (body.equals(Buffer.from("ok")) || body.equals(Buffer.from("ok\n")) || body.equals(Buffer.from("ok\r\n"))) {
    return true;
  }
  try {
    const parsed = JSON.parse(body.toString("utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) && parsed.status === "ok";
  } catch {
    return false;
  }
}

async function waitUntilDeadline(completion) {
  const remaining = remainingMs();
  if (remaining <= 0) return { timeout: true };
  return Promise.race([
    completion.then((value) => ({ timeout: false, ...value })),
    delay(remaining).then(() => ({ timeout: true }))
  ]);
}

async function runOverride() {
  const logPath = resolve(root, "logs/restore-drill-health-override.log");
  const logFd = openSync(logPath, "w", 0o600);
  let child;
  try {
    child = setOwned(spawn("bash", ["-lc", command], {
      cwd: root,
      detached: true,
      env: { ...process.env, DATA_DIR: resolve(root, "data"), INSTALL_DIR: root },
      stdio: ["ignore", "pipe", logFd]
    }));
  } finally {
    closeSync(logFd);
  }
  const chunks = [];
  let capturedBytes = 0;
  let oversized = false;
  const stdoutEnded = new Promise((resolveEnd) => {
    child.stdout.once("end", resolveEnd);
    child.stdout.once("error", resolveEnd);
  });
  child.stdout.on("data", (chunk) => {
    if (oversized) return;
    if (capturedBytes + chunk.length > maxBytes) {
      oversized = true;
      sendGroupSignal(child.pid, "SIGTERM");
      return;
    }
    chunks.push(chunk);
    capturedBytes += chunk.length;
  });
  const completion = Promise.all([ownedExit, stdoutEnded]).then(([outcome]) => outcome);
  const outcome = await waitUntilDeadline(completion);
  if (outcome.timeout || remainingMs() <= 0 || oversized || outcome.error || outcome.code !== 0) {
    await finish("failed");
  }
  await finish(validHealthBody(Buffer.concat(chunks)) ? "ok" : "failed");
}

async function runCurl(url) {
  return new Promise((resolveCurl) => {
    const maxTimeMs = Math.floor(remainingMs());
    if (maxTimeMs < 1) {
      resolveCurl({ code: null, deadline: true, oversized: false, body: Buffer.alloc(0) });
      return;
    }
    const args = ["-fsS", "--max-time", (maxTimeMs / 1000).toFixed(3), url];
    const child = spawn("curl", args, { stdio: ["ignore", "pipe", "ignore"] });
    const chunks = [];
    let capturedBytes = 0;
    let oversized = false;
    let settled = false;
    let spawnError = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolveCurl(value);
    };
    child.stdout.on("data", (chunk) => {
      if (oversized) return;
      if (capturedBytes + chunk.length > maxBytes) {
        oversized = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(chunk);
      capturedBytes += chunk.length;
    });
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code) => settle({ code, error: spawnError, oversized, body: Buffer.concat(chunks) }));
  });
}

async function runServer() {
  mkdirSync(resolve(root, "logs"), { recursive: true });
  const logFd = openSync(resolve(root, "logs/restore-drill-server.log"), "w", 0o600);
  try {
    setOwned(spawn(process.execPath, [resolve(root, "apps/server/dist/server.js")], {
      cwd: root,
      detached: true,
      env: { ...process.env, PORT: String(port), DATA_DIR: resolve(root, "data"), LOG_DIR: resolve(root, "logs") },
      stdio: ["ignore", logFd, logFd]
    }));
  } finally {
    closeSync(logFd);
  }
  const url = `http://127.0.0.1:${port}/health`;
  while (remainingMs() > 0) {
    if (!groupAlive(owned.pid)) {
      await finish("failed");
    }
    const probe = await runCurl(url);
    if (probe.oversized) {
      await finish("failed");
    }
    if (probe.code === 0 && remainingMs() > 0) {
      await finish(validHealthBody(probe.body) ? "ok" : "failed");
    }
    const afterProbe = remainingMs();
    if (afterProbe <= 0) break;
    await delay(Math.min(100, afterProbe));
  }
  await finish("failed");
}

if (mode === "override") {
  await runOverride();
} else {
  await runServer();
}
NODE
  supervisor_rc=$?
  set -e

  case "${supervisor_rc}" in
    0)
      HEALTH_STATUS="ok"
      ok "health smoke returned healthy response"
      ;;
    2)
      HEALTH_STATUS="unavailable"
      echo "ERROR: health smoke entrypoint is unavailable" >&2
      ;;
    4)
      HEALTH_STATUS="failed"
      HEALTH_PROCESS_CLEANUP_STATUS="unknown"
      echo "ERROR: health smoke failed and owned process cleanup could not be confirmed" >&2
      ;;
    *)
      HEALTH_STATUS="failed"
      echo "ERROR: health smoke failed strict response, deadline, or process checks" >&2
      ;;
  esac
}

verify_backup

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/solar-restore-XXXXXX")"
EXTRACT_DIR="${WORK_DIR}/extract"

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
  if [[ "${INTEGRITY_STATUS}" == "ok" ]]; then
    run_migrations "${DRILL_ROOT}"
  fi
  if [[ "${INTEGRITY_STATUS}" == "ok" && "${MIGRATIONS_STATUS}" == "ok" ]]; then
    run_health_smoke "${DRILL_ROOT}"
  fi

  DRILL_STATUS="failed"
  DRILL_FULL="false"
  if [[ "${INTEGRITY_STATUS}" == "ok" && "${MIGRATIONS_STATUS}" == "ok" && "${HEALTH_STATUS}" == "ok" ]]; then
    DRILL_STATUS="ok"
    DRILL_FULL="true"
  elif [[ "${INTEGRITY_STATUS}" == "ok" && "${MIGRATIONS_STATUS}" == "ok"
    && "${HEALTH_STATUS}" == "skipped" && "${RESTORE_SKIP_HEALTH:-0}" == "1" ]]; then
    DRILL_STATUS="incomplete"
  fi

  DRILL_CLEANUP_STATUS="${HEALTH_PROCESS_CLEANUP_STATUS}"
  DRILL_OWNED_PATH=""
  if [[ "${DRILL_CLEANUP_STATUS}" == "ok" ]]; then
    if rm -rf -- "${WORK_DIR}" && [[ ! -e "${WORK_DIR}" ]]; then
      WORK_DIR=""
      ROLLBACK_DIR=""
    else
      DRILL_CLEANUP_STATUS="unknown"
      DRILL_OWNED_PATH="${WORK_DIR}"
    fi
  else
    DRILL_OWNED_PATH="${WORK_DIR}"
  fi

  if [[ "${DRILL_CLEANUP_STATUS}" != "ok" ]]; then
    DRILL_STATUS="failed"
    DRILL_FULL="false"
  fi
  trap - EXIT
  DRILL_SUMMARY_EMITTED=1
  emit_drill_summary "${DRILL_STATUS}" "${DRILL_FULL}" "${DRILL_CLEANUP_STATUS}" "${DRILL_OWNED_PATH}"
  [[ "${DRILL_STATUS}" == "ok" ]] && exit 0
  exit 1
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
