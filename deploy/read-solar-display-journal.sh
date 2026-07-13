#!/bin/bash
# Least-privilege solar-display journal reader for Device Status.
# Accepts only: <recent|export> <limit>
# Unit, boot scope, and output format are fixed — no path/unit/flag injection.
set -euo pipefail

readonly UNIT="solar-display"
readonly MIN_LIMIT=1
readonly MAX_LIMIT=500

usage() {
  echo "Usage: read-solar-display-journal.sh <recent|export> <limit>" >&2
  echo "  limit must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}" >&2
  exit 2
}

if [[ "$#" -ne 2 ]]; then
  usage
fi

MODE="$1"
LIMIT_RAW="$2"

case "${MODE}" in
  recent|export) ;;
  *)
    echo "error: mode must be recent or export" >&2
    usage
    ;;
esac

# Reject anything that is not a plain base-10 integer (no signs, no spaces, no prefixes).
if [[ ! "${LIMIT_RAW}" =~ ^[0-9]+$ ]]; then
  echo "error: limit must be a positive integer" >&2
  usage
fi

# Strip leading zeros for numeric compare while keeping 0 as 0.
LIMIT=$((10#${LIMIT_RAW}))

if (( LIMIT < MIN_LIMIT )); then
  LIMIT="${MIN_LIMIT}"
elif (( LIMIT > MAX_LIMIT )); then
  LIMIT="${MAX_LIMIT}"
fi

if ! command -v journalctl >/dev/null 2>&1; then
  echo "error: journalctl is not available" >&2
  exit 1
fi

# Fixed argv only — never interpolate unvalidated strings into a shell.
# -u solar-display: fixed unit
# -b: current boot only
# -n: bounded record count
# --no-pager: non-interactive
case "${MODE}" in
  recent)
    exec journalctl -u "${UNIT}" -b --no-pager -n "${LIMIT}" -o json
    ;;
  export)
    exec journalctl -u "${UNIT}" -b --no-pager -n "${LIMIT}" -o short-iso
    ;;
esac
