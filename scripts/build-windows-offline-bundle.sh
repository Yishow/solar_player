#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
pnpm build
node scripts/build-windows-offline-bundle.mjs
