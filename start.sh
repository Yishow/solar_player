#!/usr/bin/env bash
# Solar Player repo 便捷啟動腳本（shared + server + web 開發環境）
#
# 用法：
#   ./start.sh    # 等同 pnpm dev
#
# solar_mqtt_go 收集器請改用 solar_mqtt_go/start.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "錯誤: 找不到 pnpm，請先安裝 pnpm（https://pnpm.io/installation）"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "==> 尚未安裝依賴，先執行 pnpm install..."
  pnpm install
fi

exec pnpm dev
