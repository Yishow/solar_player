# Backend Spec — Node.js + Fastify

## 1. 主要責任

Fastify 後端負責：

- 提供 REST API
- 提供 OpenAPI 文件
- 連接 MQTT Broker
- 將 MQTT 即時資料轉為 normalized metrics
- 將即時資料推送給前端 WebSocket / Socket.IO
- 寫入 SQLite 累積值與歷史資料
- 管理圖片上傳與播放設定
- 提供設備狀態資訊

## 2. 建議套件

```bash
npm install fastify @fastify/cors @fastify/static @fastify/multipart @fastify/swagger @fastify/swagger-ui
npm install mqtt socket.io better-sqlite3 zod dotenv pino
npm install -D typescript tsx vitest @types/node
```

## 3. Server 結構

```txt
apps/server/src/
  index.ts
  app.ts
  config.ts
  db/
    connection.ts
    migrations.ts
    repositories/
  mqtt/
    mqttClient.ts
    topicRegistry.ts
    payloadParser.ts
    metricAggregator.ts
  realtime/
    socketServer.ts
  routes/
    metrics.routes.ts
    settings.routes.ts
    images.routes.ts
    circuits.routes.ts
    playback.routes.ts
    device.routes.ts
  schemas/
    openapi.ts
    zod.ts
  services/
    metrics.service.ts
    images.service.ts
    playback.service.ts
    device.service.ts
```

## 4. 環境變數

```env
NODE_ENV=production
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
DATABASE_URL=./data/solar-display.sqlite
UPLOAD_DIR=./uploads/images

MQTT_ENABLED=true
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MQTT_USERNAME=kuozui_display
MQTT_PASSWORD=change-me
MQTT_CLIENT_ID=kuozui-green-display-01
MQTT_RECONNECT_INTERVAL_MS=30000
MQTT_MESSAGE_TIMEOUT_SEC=60

SOCKET_CORS_ORIGIN=http://localhost:5173
```

## 5. Fastify Plugins

| Plugin | 用途 |
|---|---|
| CORS | 開發環境跨域 |
| Static | 提供上傳圖片與前端 build |
| Multipart | 圖片上傳 |
| Swagger | OpenAPI 文件 |
| Socket.IO | 即時推送 |
| DB Plugin | 注入 SQLite instance |

## 6. 啟動流程

1. 載入 config。
2. 初始化 SQLite。
3. 執行 migration。
4. 初始化 Fastify app。
5. 註冊 routes。
6. 啟動 Socket.IO。
7. 啟動 MQTT client。
8. 將 MQTT 狀態廣播給前端。
9. 定期寫入 metrics snapshot。
10. 啟動 HTTP server。

## 7. MQTT 到資料庫流程

```txt
MQTT Broker
  -> MQTT.js subscribe
  -> payload parser
  -> topic mapping
  -> normalized live metrics
  -> in-memory current state
  -> WebSocket broadcast
  -> SQLite snapshots / daily aggregates
```

## 8. 累積值策略

SQLite 應保存：

- 每個 metric 的最後累積值
- 每日第一筆與最後一筆
- 每日發電量、用電量、CO₂ 減量
- 每 30 秒或 60 秒 snapshot，用於圖表

若 MQTT payload 本身提供累積值，優先採用 broker 的累積值。若只提供瞬時功率，則由後端以時間積分估算 kWh。

## 9. 錯誤策略

| 錯誤 | 處理 |
|---|---|
| MQTT 連線失敗 | 每 30 秒重連，廣播 status |
| Topic 無資料 | 使用 timeout 標記 stale |
| Payload parse failed | 記錄 log，不覆蓋現有值 |
| DB 寫入失敗 | 記錄 log，前端不中斷 |
| 圖片上傳失敗 | 回傳 400 / 500 |

## 10. 無權限模式注意事項

因本系統不設權限與登入：

- 建議只部署於內網。
- 設定 API 不應暴露到公網。
- Raspberry Pi 可透過防火牆限制來源。
- 若有 kiosk only 需求，可只允許 localhost 存取設定頁。
