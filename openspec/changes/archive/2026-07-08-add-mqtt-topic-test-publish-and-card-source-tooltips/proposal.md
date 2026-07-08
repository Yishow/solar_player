## Why

現場需要確認 `selfConsumptionEnergy` 與 `consumptionEnergy` 的 MQTT topic 是否正確送值，否則 `Solar` 的「自發自用比例」會由錯誤來源推導。操作員也需要在播放頁的 metric card 上直接看出卡片數值由哪些 MQTT tag 或衍生依賴組成，避免只看顯示名稱而無法追來源。

## What Changes

- 在 `MQTT Settings` 的 topic workspace 中，讓 `selfConsumptionEnergy` 與 `consumptionEnergy` 維持可設定 mapping，並可對已設定且啟用的 mapping 輸入測試數值後發佈到 broker。
- 新增管理端 MQTT 測試發佈 API，只允許對既有 topic mapping 發佈數值 payload，不提供任意 topic console。
- 在播放/monitoring 頁面的 card 顯示來源 tooltip，列出該 card 使用的 metric key、直接 MQTT topic、以及衍生依賴關係。
- 保留「自發自用比例」命名與既有推導語意：優先使用 `selfConsumptionRatio` 直接讀值；沒有直接讀值時，以 `selfConsumptionEnergy / consumptionEnergy * 100` 推導。

## Non-Goals

- 不新增任意 topic 或任意 JSON payload 的 broker console。
- 不直接寫入 `live_metric_values` 來假裝收到 MQTT；測試發佈必須走 broker publish 路徑。
- 不改自發自用比例公式與 label。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mqtt-settings-operations-surface`: topic workspace SHALL support safe numeric test publish for existing mappings, including the self-consumption source metrics.
- `display-monitoring-story-model`: monitoring cards SHALL expose source/dependency tooltip text so operators can inspect which MQTT tags compose each displayed value.

## Impact

- Affected specs: mqtt-settings-operations-surface, display-monitoring-story-model
- Affected code:
  - Modified: apps/server/src/routes/settings-mqtt.ts
  - Modified: apps/server/src/mqtt/MqttClientService.ts
  - Modified: apps/server/src/routes/settings-mqtt.test.ts
  - Modified: apps/server/src/mqtt/MqttClientService.test.ts
  - Modified: apps/web/src/pages/MqttSettings/index.tsx
  - Modified: apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - Modified: apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - Modified: apps/web/src/pages/MqttSettings/viewModel.ts
  - Modified: apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - Modified: apps/web/src/pages/Overview/runtimeContent.tsx
  - Modified: apps/web/src/pages/Solar/runtimeContent.tsx
  - Modified: apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - Modified: apps/web/src/pages/Sustainability/index.tsx
  - Modified: apps/web/src/components/displayPageCards.tsx
  - Modified: apps/web/src/pages/Overview/viewModel.test.ts
  - Modified: apps/web/src/pages/Solar/viewModel.test.ts
  - Modified: apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - Modified: apps/web/src/pages/Sustainability/viewModel.test.ts
  - New: none
  - Removed: none
