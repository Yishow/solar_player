## 1. Registry 與 Socket TDD

- [x] 1.1 先為 Aggregate Socket Connections under a stable Device Identity、Detect sustained duplicate identity across sources、Reject invalid identity and heartbeat payloads safely 寫 Fake Socket.IO failing tests；直跑 SocketService 與 deviceLivenessRegistry tests 驗證 connection aggregation、30 秒與 revocation。
- [x] 1.2 實作 Key liveness by Device Identity and retain connection children，使 disconnect 僅移除 child connection 且 last state 按既有 liveness window 保留；以 multi-connection tests 驗證。
- [x] 1.3 實作 Authenticate identity during Socket handshake 與 Server-authenticated Device Identity owns liveness state，使 heartbeat 無法自報另一 Device；以 invalid credential/claimed clientId tests 驗證。
- [x] 1.4 實作 Warn after three heartbeat intervals across different sources，使 29.999 秒無警告、30 秒告警、same-source 永不告警；以 injected clock table test 驗證。

## 2. Shared 與 Client loop

- [x] 2.1 [P] 更新 displayClientLiveness shared payload 與 snapshot，不暴露 credential/raw source；以 shared tests 與 pnpm run build:shared 驗證。
- [x] 2.2 [P] 更新 web Socket/heartbeat loop 保持 10 秒小型 payload與 authenticated connection；以 useDisplayClientHeartbeat.test.ts 與 socket.test.ts 驗證。

## 3. 整體驗證

- [x] 3.1 執行 focused Socket/shared/web tests、pnpm test、pnpm build、pnpm verify 與 spectra analyze identity-aware-display-client-liveness，修正所有 Critical/Warning。
