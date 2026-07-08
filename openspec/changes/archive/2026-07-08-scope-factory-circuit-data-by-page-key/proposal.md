## Why

中壢廠與觀音廠的 Factory Circuit 頁面已經能以不同 page key 進入，但工程別迴路、MQTT metric、總用電加總與卡片資料管理仍共用同一組全域 slot。這會讓中壢 6 個工程別與觀音 8 個工程別互相影響，且可能讓同名工程的即時值互相覆蓋。

## What Changes

- Factory Circuit 工程別迴路資料以 page key 分 scope；`factory-circuit` 與 `factory-circuit-guanyin` 各自擁有自己的 circuit bindings。
- Factory Circuit story、總用電、readiness 與 Card Data Management 只使用目標 page key 的工程別。
- Factory Circuit slot metric key 以 page key 分開，避免兩廠同名工程共用同一個 `live_metric_values.metric_key`。
- Circuit Settings API 保持既有全域列表相容，同時支援依 page key 查詢與寫入。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-circuit-multi-site-split`: Factory Circuit 多廠頁面 SHALL separate circuit data, metric keys, aggregate power, and diagnostics by page key.
- `circuit-settings-display-slot-binding`: Circuit slot binding SHALL include the target Factory Circuit page key.
- `display-card-data-management`: Card Data Management SHALL distinguish Factory Circuit page instances when listing slot rows and publish actions.
- `display-monitoring-story-model`: Factory Circuit story payloads SHALL be resolvable per Factory Circuit page key.

## Impact

- Affected specs: factory-circuit-multi-site-split, circuit-settings-display-slot-binding, display-card-data-management, display-monitoring-story-model
- Affected code:
  - Modified: packages/shared/src/types.ts
  - Modified: packages/shared/src/displayStory.ts
  - Modified: packages/shared/src/displayReadiness.ts
  - Modified: apps/server/src/db/seed.ts
  - Modified: apps/server/src/routes/circuits.ts
  - Modified: apps/server/src/routes/display-story.ts
  - Modified: apps/server/src/routes/display-card-data.ts
  - Modified: apps/server/src/services/displayStoryService.ts
  - Modified: apps/server/src/services/displayReadinessService.ts
  - Modified: apps/server/src/services/displayCardDataService.ts
  - Modified: apps/web/src/pages/FactoryCircuit/viewModel.ts
  - Modified: apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - New: apps/server/src/db/migrations/019_circuit_page_scope.sql
  - New: apps/server/src/db/migrations/020_fix_factory_circuit_site_counts.sql
