# Realtime Spec — WebSocket / Socket.IO

## 1. 建議選擇

本系統建議使用 Socket.IO，理由：

- 支援自動重連
- 支援 event name
- 前端整合簡單
- 對 kiosk 網路波動較友善

若要降低依賴，也可使用原生 WebSocket，但需自行實作 reconnect、heartbeat 與 event envelope。

## 2. Socket Namespace

```txt
/socket.io
```

或 namespace：

```txt
/live
```

## 3. Server Events

| Event | Direction | Payload | 說明 |
|---|---|---|---|
| `mqtt:status` | server -> client | `MqttStatusPayload` | MQTT 連線狀態 |
| `liveMetrics:update` | server -> client | `LiveMetricsPayload` | 即時能源指標 |
| `circuits:update` | server -> client | `CircuitMetricPayload[]` | 迴路即時資料 |
| `playback:update` | server -> client | `PlaybackSettings` | 播放設定更新 |
| `images:update` | server -> client | `ImageAsset[]` | 圖片清單更新 |
| `device:update` | server -> client | `DeviceStatusPayload` | 裝置狀態更新 |
| `error` | server -> client | `RealtimeError` | 即時錯誤 |

## 4. Client Events

| Event | Direction | Payload | 說明 |
|---|---|---|---|
| `client:ready` | client -> server | `{ page: string }` | 前端連線完成 |
| `metrics:requestSnapshot` | client -> server | none | 要求目前資料快照 |
| `playback:setCurrentPage` | client -> server | `{ pageKey: string }` | 手動切換頁面 |

## 5. Payload Types

```ts
export interface MqttStatusPayload {
  status: 'connected' | 'connecting' | 'disconnected' | 'stale' | 'error';
  lastMessageAt?: string;
  errorReason?: string;
  retryInSec?: number;
}

export interface LiveMetricsPayload {
  realTimePowerKw: number;
  todayGenerationKwh: number;
  totalGenerationKwh: number;
  todayCo2ReductionT: number;
  totalCo2ReductionT: number;
  selfConsumptionKwh: number;
  consumptionKwh: number;
  selfConsumptionRatio: number;
  systemEfficiency: number;
  updatedAt: string;
}

export interface CircuitMetricPayload {
  circuitId: string;
  value: number;
  unit: string;
  percentageOfRatedCapacity: number;
  status: 'normal' | 'attention' | 'warning';
  updatedAt: string;
}
```

## 6. 廣播頻率

| 資料 | 頻率 |
|---|---|
| MQTT message | 收到即廣播，可做 500ms debounce |
| Live metrics aggregate | 1 秒內最多 1 次 |
| Device status | 5–10 秒一次 |
| History charts | 透過 REST API 載入，不建議用 socket 長推 |
| Playback setting changed | 變更時即廣播 |

## 7. Heartbeat

Socket.IO 內建 ping/pong。建議設定：

```ts
const io = new Server(httpServer, {
  cors: { origin: process.env.SOCKET_CORS_ORIGIN },
  pingInterval: 25000,
  pingTimeout: 20000,
});
```

## 8. Offline Error Page 觸發

前端判斷：

```txt
mqtt status = disconnected 或 stale
且持續超過 messageTimeoutSec
=> 顯示 Offline Error Display
```

後端也可直接推送：

```ts
io.emit('mqtt:status', {
  status: 'stale',
  lastMessageAt,
  errorReason: 'MQTT message timeout',
  retryInSec: 30
});
```
