## Why

目前 `Playback Settings`、`MQTT Settings`、`Circuit Settings`、`Image Management` 都會在收到 `display:sync` 後立即重抓 server state。當操作員正在編輯但尚未儲存時，這種背景同步可能直接覆蓋本地 draft，讓設定頁成為高風險操作面。

## What Changes

- 為管理頁新增 dirty-aware display sync 保護層，讓 `display:sync` 到來時先判斷本地是否有未儲存編輯。
- 在 dirty 狀態下改為顯示「遠端已有新資料」提示與明確操作選項，而不是自動覆蓋本地 draft。
- 在 clean 狀態下維持既有跨頁同步能力，讓 publish、asset health、readiness 與配置摘要仍可自動更新。
- 統一 `Playback Settings`、`MQTT Settings`、`Circuit Settings`、`Image Management` 的 remote-change banner / reload 決策語意，避免每頁各自處理。

## Capabilities

### New Capabilities

- `management-display-sync-draft-protection`: 管理頁在收到 `display:sync` 時保護未儲存的本地 draft，並提供明確的重新同步決策流程。

### Modified Capabilities

(none)

## Impact

- Affected specs: `management-display-sync-draft-protection`
- Affected code:
  - Modified:
    - apps/web/src/hooks/useDisplaySyncRefresh.ts
    - apps/web/src/pages/PlaybackSettings/index.tsx
    - apps/web/src/pages/MqttSettings/index.tsx
    - apps/web/src/pages/CircuitSettings/index.tsx
    - apps/web/src/pages/ImageManagement/index.tsx
    - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - New:
    - apps/web/src/hooks/displaySyncDraftGuard.ts
    - apps/web/src/components/management/RemoteSyncBanner.tsx
  - Removed: (none)
