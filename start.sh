#!/usr/bin/env bash
# Solar Player & solar_mqtt_go 便捷啟動腳本
set -euo pipefail
cd "$(dirname "$0")"

if [ -f "solar_mqtt_go/start.sh" ]; then
  exec "solar_mqtt_go/start.sh" "$@"
else
  echo "錯誤: 找不到 solar_mqtt_go/start.sh"
  exit 1
fi
