## Why

Profile Publish 若只在 Server 建立版本，無法證明 50 台 Client 何時安全套用或是否仍停留在舊版本。需要 desired／applied 狀態、Safe Playback Boundary 與管理彙總，才能把發布結果變成可觀察且可恢復的現場狀態。

## What Changes

- Publish 將新 Desired Version 指派給所有目標 Group，不做 canary 或自動分批。
- Client 保留上一個 Applied Version，背景取得 desired snapshot，並於 Safe Playback Boundary 套用。
- 當前頁仍有效時完成當前頁；失效時於最近可控邊界切到新版本起始頁或第一個有效頁。
- Heartbeat 回報 desiredVersion、appliedVersion 與 waiting／applied／failed 狀態。
- 管理端彙總已套用、等待、離線與失敗裝置數；離線 Client 不阻擋其他 Client。
- 失敗 Client 保留上一個 Applied Version；恢復連線後補取 Desired Version。

## Capabilities

### New Capabilities

- device-profile-rollout-observability: 定義 Profile Version 指派、安全套用、失敗保留與逐台狀態。

### Modified Capabilities

- display-client-liveness: Heartbeat 加入 desired／applied Profile Version 與 Update State。
- playback-runtime-display-sync: Profile 更新不得以立即 reload 中斷目前頁面。

## Impact

- Affected specs: device-profile-rollout-observability, display-client-liveness, playback-runtime-display-sync
- Affected code:
  - New: apps/server/src/db/migrations/032_device_profile_rollout.sql, apps/server/src/services/deviceProfileRolloutService.ts, apps/server/src/routes/device-profile-rollout.test.ts, packages/shared/src/deviceProfileRollout.ts, apps/web/src/services/profileRollout.ts, apps/web/src/services/profileRollout.test.ts
  - Modified: apps/server/src/realtime/SocketService.ts, packages/shared/src/displayClientLiveness.ts, packages/shared/src/index.ts, apps/web/src/hooks/usePlaybackController.ts, apps/web/src/hooks/useDisplayClientHeartbeat.ts, apps/web/src/pages/DeviceFleet/viewModel.ts
  - Removed: none
