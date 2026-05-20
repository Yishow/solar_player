## Why

多個 management 頁面目前會對任何 `display:sync` 事件重載或跳 remote-change banner，即使事件 scope 與該頁完全無關。這會放大治理噪音，讓操作員在編輯品牌、MQTT、播放設定或圖片時持續被不相干同步干擾。

## What Changes

- 建立 management-side 的 scope-aware sync contract，讓各頁只對與自己資料域相關的 `display:sync.scope` 做 refresh 或 dirty warning。
- 區分「需要立即刷新摘要」與「有草稿時延後套用」兩種行為，避免把所有事件都提升成阻斷性 banner。
- 補上跨頁 regression tests，確認 brand、MQTT、playback、images、circuits、device status 等頁面不會再被不相干 scope 噪音誤觸發。

## Non-Goals

- 不改動 playback/display runtime pages 自己的 runtime refresh registry。
- 不引入新的 socket event 類型，只在既有 `display:sync` scope contract 上收斂行為。

## Capabilities

### New Capabilities

- `management-display-sync-scoping`: 定義 management surfaces 如何依 `display:sync.scope` 精準 refresh、延後套用或忽略不相干事件。

### Modified Capabilities

- `display-ops-cross-surface-sync`: 將跨頁同步從粗粒度重載收斂為只刷新真正受影響的 management surfaces。

## Impact

- Affected specs: `management-display-sync-scoping`, `display-ops-cross-surface-sync`
- Affected code:
  - Modified: `apps/web/src/hooks/useDisplaySyncRefresh.ts`
  - Modified: `apps/web/src/hooks/displaySyncDraftGuard.ts`
  - Modified: `apps/web/src/pages/BrandAssets/index.tsx`
  - Modified: `apps/web/src/pages/MqttSettings/index.tsx`
  - Modified: `apps/web/src/pages/PlaybackSettings/index.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/index.tsx`
  - Modified: `apps/web/src/pages/CircuitSettings/index.tsx`
  - Modified: `apps/web/src/pages/DeviceStatus/index.tsx`
  - Modified: `apps/web/src/pages/managementDisplaySync.test.ts`
