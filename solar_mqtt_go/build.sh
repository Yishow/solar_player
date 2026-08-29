#!/usr/bin/env bash
# 產出 solar_mqtt_go 的 Windows 單檔發佈 binary。
#
# 產物（dist/）：
#   solar_mqtt_go_windows_amd64_tray.exe    Windows 系統列版（GUI 子系統，無黑視窗）
#   solar_mqtt_go_windows_amd64_console.exe Windows 主控台版（CLI 除錯用）
set -euo pipefail
cd "$(dirname "$0")"

OUT=dist
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> windows/amd64 tray（GUI 子系統，無主控台）"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
  go build -ldflags "-s -w -H windowsgui" -o "$OUT/solar_mqtt_go_windows_amd64_tray.exe" .

echo "==> windows/amd64 console（CLI）"
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
  go build -ldflags "-s -w" -o "$OUT/solar_mqtt_go_windows_amd64_console.exe" .

test "$(find "$OUT" -maxdepth 1 -type f | wc -l | tr -d ' ')" -eq 2
echo "==> 產物清單"
file "$OUT"/*
