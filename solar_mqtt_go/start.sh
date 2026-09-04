#!/usr/bin/env bash
# 啟動 solar_mqtt_go 發電量擷取服務
#
# 用法：
#   ./start.sh              # 預設執行（桌面環境啟動系統列圖示 + 自動開啟網頁儀表板）
#   ./start.sh tray         # 系統列常駐模式
#   ./start.sh run          # 主控台循環模式（終端日誌 + 網頁儀表板）
#   ./start.sh once         # 每廠各抓一輪後退出
#   ./start.sh test-login   # 測試廠區登入
#   ./start.sh test-mqtt    # 測試 MQTT 連線
set -euo pipefail
cd "$(dirname "$0")"

# 載入本機 .env（若存在）
if [ -f "../.env" ]; then
  set -a
  source "../.env"
  set +a
elif [ -f ".env" ]; then
  set -a
  source ".env"
  set +a
fi

# 若當前目錄無 solar_config.json，自動從 solar_mqtt 複製
if [ ! -f "solar_config.json" ] && [ -f "../solar_mqtt/solar_config.json" ]; then
  cp "../solar_mqtt/solar_config.json" "solar_config.json"
  echo "==> 已載入預設兩廠 solar_config.json"
fi

# 檢查本機 1883 埠號是否已有 MQTT Broker 運作；若無則自動啟動本機 mosquitto
if ! nc -z 127.0.0.1 1883 2>/dev/null; then
  MOSQ_BIN=""
  for candidate in "/opt/homebrew/sbin/mosquitto" "/usr/local/sbin/mosquitto" "$(which mosquitto 2>/dev/null || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      MOSQ_BIN="$candidate"
      break
    fi
  done

  if [ -n "$MOSQ_BIN" ]; then
    echo "==> 偵測到本機 MQTT Broker 尚未啟動，自動背景啟動: $MOSQ_BIN"
    "$MOSQ_BIN" -d 2>/dev/null || true
    sleep 1
  else
    echo "==> 提示: 本機 1883 埠號未有 MQTT Broker 監聽，請確認 Broker 已啟動"
  fi
fi

# 決定執行模式：無參數時在桌面環境預設啟動 tray
SUBCMD="${1:-}"
if [ -z "$SUBCMD" ]; then
  if [ "$(uname)" = "Darwin" ] || [ -n "${DISPLAY:-}" ]; then
    SUBCMD="tray"
  else
    SUBCMD="run"
  fi
fi

echo "==> 啟動 solar_mqtt_go (模式: $SUBCMD)..."
echo "==> 儀表板網址: http://127.0.0.1:18868/"

RUN_BINARY=".solar_mqtt_go_run"
go build -o "./$RUN_BINARY" .

# 背景延遲 1.2 秒自動開啟瀏覽器
(
  sleep 1.2
  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:18868/" 2>/dev/null || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:18868/" 2>/dev/null || true
  fi
) &

if [ $# -eq 0 ]; then
  exec "./$RUN_BINARY" "$SUBCMD"
else
  exec "./$RUN_BINARY" "$@"
fi
