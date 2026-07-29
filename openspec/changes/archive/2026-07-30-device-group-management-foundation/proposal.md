## Why

約 50 台 Client 目前沒有穩定的 Device 與 Group source of truth，Server 也無法由管理端預先配置裝置所屬廠區與 Playback Profile。這個基礎必須先於配對與 device-scoped playback 建立。

## What Changes

- 建立具唯一 clientId、displayName、enabled 狀態的 Device 資料模型。
- 建立扁平 Device Group，限定 Site Scope 為 cl 或 kn，並指派一個 Playback Profile。
- 強制每台可正式播放的 Device 隸屬恰好一個啟用 Group，不提供階層繼承或 per-device override。
- 提供受既有 management mutation trust boundary 保護的 Device／Group CRUD API。
- 以可重跑 migration 與 Fastify integration tests 驗證唯一性、停用與指派規則。

## Capabilities

### New Capabilities

- device-group-management: 定義 Device、扁平 Group、Site Scope 與 Playback Profile 指派契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: device-group-management
- Affected code:
  - New: apps/server/src/db/migrations/029_device_group_management.sql, apps/server/src/services/deviceGroupService.ts, apps/server/src/routes/device-groups.ts, apps/server/src/routes/devices.ts, apps/server/src/routes/device-group-management.test.ts, packages/shared/src/deviceIdentity.ts
  - Modified: apps/server/src/app.ts, packages/shared/src/index.ts
  - Removed: none
