## Why

目前管理面只對 mutation API 套用 access boundary，但大多數管理讀取面、裝置診斷摘要、日誌 metadata 與 websocket 初始快照仍可直接讀取。這讓系統在非單機、非純 loopback 的部署下，仍會把 MQTT 狀態、即時 metrics、裝置資訊與敏感診斷資料暴露給未受信任的讀取方。

## What Changes

- 為 management 與 diagnostics 類讀取 API 建立一致的 trusted-origin / access-token read boundary，而不是只保護 mutation。
- 收斂 Socket.IO session gating，區分 playback 可見事件與 management-only runtime/diagnostic feeds。
- 讓 `Device Status`、display ops、readiness、log metadata 等管理讀取面遵循同一套授權與錯誤回應規則。
- 補上前後端 contract，讓未授權讀取方得到明確 denied/degraded 結果，而不是讀到完整管理資料。

## Capabilities

### New Capabilities

- `management-read-access-boundaries`: 管理讀取 API 與診斷讀取面只對 trusted management caller 暴露完整資料，未授權請求必須被拒絕或降級。
- `management-socket-session-boundaries`: websocket 連線必須區分 playback 與 management session，management-only runtime feeds 不得在未授權 session 自動下發。

### Modified Capabilities

- `device-status-log-access`: `Device Status` 的 log listing / export metadata 必須落在 trusted management read boundary 內。
- `device-status-display-diagnostics`: `Device Status` 的安全診斷動作與摘要輸出必須只對受信任 operator session 開放。
- `device-status-display-ops-summary`: `Device Status` 的 display ops summary 在未授權讀取情境下不得暴露完整管理細節。

## Impact

- Affected code:
  - Modified:
    - apps/server/src/plugins/managementAuth.ts
    - apps/server/src/app.ts
    - apps/server/src/realtime/SocketService.ts
    - apps/server/src/routes/device.ts
    - apps/server/src/routes/device-display-ops.ts
    - apps/server/src/routes/display-ops.ts
    - apps/server/src/routes/display-readiness.ts
    - apps/server/src/routes/settings-mqtt.ts
    - apps/web/src/services/socket.ts
    - apps/web/src/services/api.ts
    - apps/web/src/pages/DeviceStatus/index.tsx
    - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
    - apps/web/src/hooks/useDisplayReadiness.ts
    - apps/web/src/hooks/useMqttStatus.ts
    - apps/web/src/hooks/useLiveMetrics.ts
  - New:
    - packages/shared/src/managementAccess.ts
  - Removed: (none)
