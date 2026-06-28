# playback-metric-display-name-source Specification

## Purpose

TBD - created by archiving change 'mqtt-topic-custom-display-names'. Update Purpose after archive.

## Requirements

### Requirement: Topic custom names are the source of playback metric display names

The system SHALL resolve the display name of each story-driven playback metric card that maps to a `metric_key` from that metric's topic mapping custom name, and SHALL deliver the resolved name to playback through the playback-safe display-story payload. When a metric maps to a topic mapping whose `nameZh`/`nameEn` is set, the playback card SHALL display that custom name as the authoritative source. Management topic data SHALL NOT be exposed directly to playback sessions; the server story payload is the sole delivery channel.

#### Scenario: Custom name drives playback label

- **WHEN** a topic mapping for a given `metric_key` has a custom Chinese name set
- **AND** a story-driven playback page (Overview, Solar, or Factory Circuit) renders the card bound to that `metric_key` with the display-story payload present
- **THEN** the card's label displays the custom name resolved by the server story

##### Example: metric_key to playback label

| metric_key            | topic nameZh | Rendered playback label |
| --------------------- | ------------ | ----------------------- |
| realTimePower         | "即時輸出"   | "即時輸出"              |
| factoryProductionPower| "一號產線"   | "一號產線"              |


<!-- @trace
source: mqtt-topic-custom-display-names
updated: 2026-06-29
code:
  - packages/shared/src/types.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
-->

---
### Requirement: Unset custom names and absent story fall back to built-in defaults

The system SHALL fall back to the page's built-in default display name when a metric's topic custom name is unset (null or empty). The server story resolution path SHALL be the authority for custom names; when the display-story payload is absent (the transient client fallback path), the playback page SHALL render its built-in default label rather than a blank or stale custom name.

#### Scenario: Empty custom name keeps default label

- **WHEN** a topic mapping's custom name for a `metric_key` is unset
- **THEN** the server story resolves the page's built-in default name
- **AND** no blank label is shown

#### Scenario: Missing topic mapping keeps default label

- **WHEN** a playback card is bound to a `metric_key` that has no topic mapping
- **THEN** the server story resolves the page's built-in default name without error

#### Scenario: Client fallback without story shows built-in default

- **WHEN** the display-story payload is absent for a story-driven playback page
- **THEN** the page renders its built-in default label
- **AND** no blank label is shown


<!-- @trace
source: mqtt-topic-custom-display-names
updated: 2026-06-29
code:
  - packages/shared/src/types.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
-->

---
### Requirement: Factory Circuit prefers topic custom name over circuit config name

The system SHALL resolve Factory Circuit load-row display names with topic custom name as the highest priority, falling back to `CircuitConfig` name, then to the slot built-in default. The `CircuitConfig` name SHALL remain available as a secondary fallback rather than being removed.

#### Scenario: Topic name overrides circuit config

- **WHEN** a Factory Circuit slot maps via `display_slot` to a `metric_key` whose topic custom name is set
- **AND** that slot's `CircuitConfig` name is also set
- **THEN** the load row displays the topic custom name

##### Example: Factory Circuit name priority

| topic nameZh | CircuitConfig nameZh | slot default | Rendered label |
| ------------ | -------------------- | ------------ | -------------- |
| "一號產線"   | "生產區"             | "生產線用電" | "一號產線"     |
| null         | "生產區"             | "生產線用電" | "生產區"       |
| null         | null                 | "生產線用電" | "生產線用電"   |

<!-- @trace
source: mqtt-topic-custom-display-names
updated: 2026-06-29
code:
  - packages/shared/src/types.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
-->