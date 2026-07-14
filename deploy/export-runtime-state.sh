#!/bin/bash
# Create a verifiable, secret-safe runtime backup of an install root.
# Intended to run only after solar-display.service is stopped (fail-closed if active).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
TIMESTAMP="${BACKUP_TIMESTAMP:-${EXPORT_TIMESTAMP:-$(date +%Y%m%d-%H%M%S)}}"
BACKUP_ROOT="${BACKUP_ROOT:-${EXPORT_OUTPUT_DIR:-${INSTALL_DIR}/backups}}"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
DB_PATH="${INSTALL_DIR}/data/solar-display.sqlite"
REQUIRE_PRIOR_APP="${REQUIRE_PRIOR_APP:-1}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

ok() {
  echo "OK: $*"
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

  fail "sha256sum or shasum is required to produce archive evidence"
}

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "${value}"
}

ensure_service_inactive() {
  if ! command -v systemctl >/dev/null 2>&1; then
    if [[ "${EXPORT_ALLOW_LIVE:-0}" == "1" ]]; then
      ok "systemctl unavailable; EXPORT_ALLOW_LIVE=1 opt-in accepted (live copy risk)"
      return 0
    fi
    fail "systemctl unavailable; cannot confirm solar-display.service is inactive. Stop it manually or set EXPORT_ALLOW_LIVE=1 to proceed at your own risk (refusing live SQLite copy)"
  fi

  if systemctl is-active --quiet solar-display 2>/dev/null; then
    fail "solar-display.service is active; stop it before export (refusing live SQLite copy)"
  fi
}

checkpoint_sqlite() {
  if [[ ! -f "${DB_PATH}" ]]; then
    return 0
  fi

  command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 is required for WAL checkpoint and integrity preflight"

  if ! sqlite3 "${DB_PATH}" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null; then
    fail "SQLite WAL checkpoint failed for ${DB_PATH}"
  fi

  local integrity
  integrity="$(sqlite3 "${DB_PATH}" "PRAGMA integrity_check;")"
  if [[ "${integrity}" != "ok" ]]; then
    fail "SQLite integrity_check failed for ${DB_PATH}: ${integrity}"
  fi

  ok "sqlite checkpoint and integrity_check passed"
}

collect_schema_versions() {
  SCHEMA_VERSIONS_JSON="[]"
  if [[ ! -f "${DB_PATH}" ]] || ! command -v sqlite3 >/dev/null 2>&1; then
    return 0
  fi

  local versions=()
  local version
  while IFS= read -r version; do
    [[ -n "${version}" ]] || continue
    versions+=("${version}")
  done < <(sqlite3 "${DB_PATH}" "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null || true)

  if [[ "${#versions[@]}" -eq 0 ]]; then
    return 0
  fi

  local parts=()
  for version in "${versions[@]}"; do
    parts+=("\"$(json_escape "${version}")\"")
  done
  SCHEMA_VERSIONS_JSON="[$(IFS=,; echo "${parts[*]}")]"
}

read_release_identity() {
  RELEASE_NAME="solar-display"
  RELEASE_VERSION="unknown"
  if [[ -f "${INSTALL_DIR}/package.json" ]] && command -v node >/dev/null 2>&1; then
    local parsed
    parsed="$(
      node -e '
        const fs = require("fs");
        const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        process.stdout.write(`${p.name || "solar-display"}\n${p.version || "unknown"}`);
      ' "${INSTALL_DIR}/package.json" 2>/dev/null || true
    )"
    if [[ -n "${parsed}" ]]; then
      RELEASE_NAME="$(printf '%s\n' "${parsed}" | sed -n '1p')"
      RELEASE_VERSION="$(printf '%s\n' "${parsed}" | sed -n '2p')"
    fi
  elif [[ -f "${INSTALL_DIR}/package.json" ]]; then
    RELEASE_NAME="$(sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${INSTALL_DIR}/package.json" | head -n1)"
    RELEASE_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${INSTALL_DIR}/package.json" | head -n1)"
    RELEASE_NAME="${RELEASE_NAME:-solar-display}"
    RELEASE_VERSION="${RELEASE_VERSION:-unknown}"
  fi
}

write_json_manifest() {
  local out_path="$1"
  local include_payloads="$2"
  local entry
  local first

  {
    printf '{\n'
    printf '  "schemaVersion": 1,\n'
    printf '  "createdAt": "%s",\n' "$(json_escape "${CREATED_AT}")"
    printf '  "sourceRelease": {\n'
    printf '    "name": "%s",\n' "$(json_escape "${RELEASE_NAME}")"
    printf '    "version": "%s",\n' "$(json_escape "${RELEASE_VERSION}")"
    printf '    "installDir": "%s"\n' "$(json_escape "${INSTALL_DIR}")"
    printf '  },\n'
    printf '  "schemaVersions": %s,\n' "${SCHEMA_VERSIONS_JSON}"
    printf '  "entries": ['
    first=1
    for entry in "${runtime_entries[@]}"; do
      if [[ "${first}" -eq 1 ]]; then
        first=0
      else
        printf ','
      fi
      printf '"%s"' "$(json_escape "${entry}")"
    done
    printf '],\n'
    if [[ "${include_payloads}" == "1" ]]; then
      printf '  "payloads": {\n'
      printf '    "runtime.tar.gz": {\n'
      printf '      "sha256": "%s",\n' "$(json_escape "${RUNTIME_SHA}")"
      printf '      "size": %s\n' "${RUNTIME_SIZE}"
      printf '    },\n'
      printf '    "prior-application.tar.gz": {\n'
      printf '      "sha256": "%s",\n' "$(json_escape "${PRIOR_SHA}")"
      printf '      "size": %s\n' "${PRIOR_SIZE}"
      printf '    }\n'
      printf '  },\n'
    fi
    if [[ "${contains_secrets}" == "true" ]]; then
      printf '  "containsSecrets": true\n'
    else
      printf '  "containsSecrets": false\n'
    fi
    printf '}\n'
  } > "${out_path}"
}

[[ -d "${INSTALL_DIR}" ]] || fail "Install dir not found: ${INSTALL_DIR}"

ensure_service_inactive

runtime_entries=()
contains_secrets=false

add_if_exists() {
  local relative_path="$1"
  if [[ -e "${INSTALL_DIR}/${relative_path}" ]]; then
    runtime_entries+=("${relative_path}")
  fi
}

add_if_exists "data"
if [[ -d "${INSTALL_DIR}/uploads" ]]; then
  runtime_entries+=("uploads")
else
  add_if_exists "uploads/images"
  add_if_exists "uploads/brand"
fi
add_if_exists ".env"

if [[ " ${runtime_entries[*]} " == *" .env "* ]]; then
  contains_secrets=true
fi

if [[ "${#runtime_entries[@]}" -eq 0 ]]; then
  fail "Nothing to export under ${INSTALL_DIR}"
fi

checkpoint_sqlite
collect_schema_versions
read_release_identity

CREATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
mkdir -p "${BACKUP_DIR}"
chmod 0700 "${BACKUP_DIR}"

RUNTIME_ARCHIVE="${BACKUP_DIR}/runtime.tar.gz"
PRIOR_ARCHIVE="${BACKUP_DIR}/prior-application.tar.gz"
RUNTIME_SIDECAR="${BACKUP_DIR}/runtime.tar.gz.sha256"
MANIFEST_PATH="${BACKUP_DIR}/manifest.json"
STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/solar-export-XXXXXX")"
cleanup() {
  rm -rf "${STAGE_DIR}"
}
trap cleanup EXIT

# Inventory manifest placed inside the runtime archive.
INVENTORY_PATH="${STAGE_DIR}/manifest.json"
RUNTIME_SHA=""
PRIOR_SHA=""
RUNTIME_SIZE="0"
PRIOR_SIZE="0"
write_json_manifest "${INVENTORY_PATH}" "0"

STAGE_RUNTIME="${STAGE_DIR}/runtime-tree"
mkdir -p "${STAGE_RUNTIME}"
for entry in "${runtime_entries[@]}"; do
  parent="$(dirname "${entry}")"
  if [[ "${parent}" != "." ]]; then
    mkdir -p "${STAGE_RUNTIME}/${parent}"
  fi
  cp -a "${INSTALL_DIR}/${entry}" "${STAGE_RUNTIME}/${entry}"
done
cp "${INVENTORY_PATH}" "${STAGE_RUNTIME}/manifest.json"
tar -czf "${RUNTIME_ARCHIVE}" -C "${STAGE_RUNTIME}" .
chmod 0600 "${RUNTIME_ARCHIVE}"

# Prior application archive: executable bundle only.
# Build in STAGE_DIR first so tar never packs the archive being written when
# BACKUP_ROOT lives under INSTALL_DIR.
prior_excludes=(
  --exclude=./.env
  --exclude=./data
  --exclude=./logs
  --exclude=./uploads
  --exclude=./backups
  --exclude=./exports
  --exclude=./node_modules
)
# Also exclude the relative backup root when it is nested under the install dir.
case "${BACKUP_DIR}" in
  "${INSTALL_DIR}"/*)
    rel_backup="${BACKUP_DIR#${INSTALL_DIR}/}"
    prior_excludes+=(--exclude="./${rel_backup%%/*}")
    ;;
esac
PRIOR_STAGE="${STAGE_DIR}/prior-application.tar.gz"
if ! tar -czf "${PRIOR_STAGE}" "${prior_excludes[@]}" -C "${INSTALL_DIR}" .; then
  if [[ "${REQUIRE_PRIOR_APP}" == "1" ]]; then
    fail "prior application archive creation failed"
  fi
fi
[[ -f "${PRIOR_STAGE}" ]] || fail "prior application archive missing after export"
cp "${PRIOR_STAGE}" "${PRIOR_ARCHIVE}"
chmod 0600 "${PRIOR_ARCHIVE}"

RUNTIME_SHA="$(sha256_file "${RUNTIME_ARCHIVE}")"
PRIOR_SHA="$(sha256_file "${PRIOR_ARCHIVE}")"
RUNTIME_SIZE="$(wc -c < "${RUNTIME_ARCHIVE}" | tr -d ' ')"
PRIOR_SIZE="$(wc -c < "${PRIOR_ARCHIVE}" | tr -d ' ')"

printf '%s  %s\n' "${RUNTIME_SHA}" "runtime.tar.gz" > "${RUNTIME_SIDECAR}"
chmod 0600 "${RUNTIME_SIDECAR}"

write_json_manifest "${MANIFEST_PATH}" "1"
chmod 0600 "${MANIFEST_PATH}"

# Verify sidecar hash and manifest payload checksums before reporting success.
VERIFY_SHA="$(sha256_file "${RUNTIME_ARCHIVE}")"
[[ "${VERIFY_SHA}" == "${RUNTIME_SHA}" ]] || fail "runtime archive checksum verification failed after write"
SIDECAR_SHA="$(awk '{print $1}' "${RUNTIME_SIDECAR}")"
[[ "${SIDECAR_SHA}" == "${RUNTIME_SHA}" ]] || fail "runtime archive sidecar does not match archive"

MANIFEST_RUNTIME_SHA="$(
  node -e '
    const fs = require("fs");
    const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(m.payloads["runtime.tar.gz"].sha256);
  ' "${MANIFEST_PATH}" 2>/dev/null || true
)"
if [[ -z "${MANIFEST_RUNTIME_SHA}" ]]; then
  MANIFEST_RUNTIME_SHA="$(sed -n 's/.*"sha256": "\([a-f0-9]*\)".*/\1/p' "${MANIFEST_PATH}" | head -n1)"
fi
[[ "${MANIFEST_RUNTIME_SHA}" == "${RUNTIME_SHA}" ]] || fail "manifest runtime checksum mismatch"

chmod 0700 "${BACKUP_DIR}"
find "${BACKUP_DIR}" -type f -exec chmod 0600 {} +

ok "verified runtime backup created"
echo "BACKUP_DIR=${BACKUP_DIR}"
echo "Exported runtime backup:"
echo "  ${BACKUP_DIR}"
echo "  runtime archive: ${RUNTIME_ARCHIVE}"
echo "  prior application: ${PRIOR_ARCHIVE}"
echo "  manifest: ${MANIFEST_PATH}"
echo "Included paths:"
for entry in "${runtime_entries[@]}"; do
  echo "  - ${entry}"
done
if [[ "${contains_secrets}" == "true" ]]; then
  echo "containsSecrets: true (owner-only permissions enforced; do not upload unencrypted)"
fi
