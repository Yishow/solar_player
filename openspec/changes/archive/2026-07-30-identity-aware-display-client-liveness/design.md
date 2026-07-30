## Context

現有 SocketService 以 socket.id 保存 heartbeat；此前置 change 需要 secure pairing 與 Device context，使 Socket handshake 能綁定不可自報的 Device Identity。

## Goals / Non-Goals

**Goals:**

- 一個 Device 聚合多個暫時 Socket Connections。
- 保存最後上線與播放狀態，區分正常重連與可疑重複身份。
- 維持 10 秒小型 heartbeat。

**Non-Goals:**

- 不踢除重複 connection、不自動撤銷 credential。
- 不在此 change 建立管理頁或 Time Sync fields。
- 不以 IP 當 Device 主鍵。

## Decisions

### Key liveness by Device Identity and retain connection children

Registry 以 deviceId 為主 key，內含 connectionId、connectedAt、lastHeartbeatAt、normalized source fingerprint。disconnect 只刪除 connection；Device summary 保留 lastSeen 與最後 payload，直到既有 liveness retention window 到期。

### Authenticate identity during Socket handshake

Socket handshake 解析同一 HttpOnly credential，heartbeat payload 不含可覆寫 identity。無效 Credential 不加入 Device room，也不接受 client:heartbeat。替代方案是 heartbeat 自報 clientId，容易偽造，故不採用。

### Warn after three heartbeat intervals across different sources

同 credential 同來源的重連不警告；不同 source fingerprint 同時存活超過 30 秒時 duplicateIdentity=true。狀態恢復為單一來源後 warning 清除，但 last duplicate timestamp 保留供 operator 查看。

## Implementation Contract

**Behavior**

- Device summary 聚合 connectedCount、lastSeenAt、route、pageKey、isPlaying、group/site summary 與 duplicate warning。
- 多 connection 中以最新 valid heartbeat 作 current playback state。
- invalid payload 只警告並忽略，不破壞上一個 valid state。
- unknown/unpaired socket 不進入 Device registry。

**Interface / data shape**

- DisplayClientHeartbeat 保留 route、pageKey、isPlaying，identity 由 Server 注入。
- Liveness snapshot 以 deviceId 排列，每筆含 connections summary，而非暴露 raw credential。
- source fingerprint 不回傳完整 IP；管理 API只回 same-source／multi-source 診斷。

**Failure modes**

- Credential 在連線中被撤銷時，下一 heartbeat 驗證失敗並斷開該 socket。
- 一個 connection disconnect 不得把其他 connection 的 Device 標成 offline。
- 來源資訊缺失時不產生 duplicate warning，並標記 source-unknown。

**Acceptance criteria**

- Fake Socket.IO tests 覆蓋單連線、同來源重連、不同來源 30 秒、撤銷、invalid payload 與 disconnect。
- shared liveness tests、web heartbeat loop tests、server/web suites、build 與 pnpm verify 通過。

**Scope boundaries**

- In scope：Socket authentication、registry、shared payload、heartbeat loop。
- Out of scope：管理 CRUD UI、Server Time Signal、profile rollout fields。

## Risks / Trade-offs

- [NAT 可能讓不同裝置看似同來源] → warning 同時需要相同 credential 且持續 30 秒，不以來源單獨判定身份。
- [保留 last state 可能被誤認在線] → liveness state 繼續依 heartbeat age 分為 live/stale/offline。
