## Why

現有 liveness registry 以 Socket ID 表示一個連線，斷線即消失，不能代表永久 Device，也無法區分正常重連與 Credential 被複製。Heartbeat 必須聚合到可信 Device Identity，才能支援約 50 台現場 Client 的狀態與異常判讀。

## What Changes

- Socket 連線由 Device Credential 綁定 Device Identity，不接受 heartbeat 自報 clientId。
- 一個 Device 聚合零到多個 Socket Connections，保留 last seen、route、page 與 playback state。
- 同 Credential／同來源的短暫多連線不阻擋；長時間不同來源同時在線產生 duplicate identity warning。
- Heartbeat payload 增加穩定 Device、Group 與 Site 摘要，並保持 10 秒固定週期的小型 payload。
- disconnect 只移除該 connection；Device liveness entry 依 last seen 狀態保留可觀察性。
- 以 Fake Socket.IO contract tests 驗證連線、重連、invalid payload、聚合與警告。

## Capabilities

### New Capabilities

- identity-aware-display-client-liveness: 定義 Device Identity 聚合與重複身份偵測。

### Modified Capabilities

- display-client-liveness: 現有 Socket liveness 從 connection identity 演進為 Device identity。

## Impact

- Affected specs: identity-aware-display-client-liveness, display-client-liveness
- Affected code:
  - New: apps/server/src/services/deviceLivenessRegistry.ts, apps/server/src/services/deviceLivenessRegistry.test.ts
  - Modified: apps/server/src/realtime/SocketService.ts, apps/server/src/realtime/SocketService.test.ts, packages/shared/src/displayClientLiveness.ts, packages/shared/src/index.ts, apps/web/src/services/socket.ts, apps/web/src/hooks/useDisplayClientHeartbeat.ts, apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - Removed: none
