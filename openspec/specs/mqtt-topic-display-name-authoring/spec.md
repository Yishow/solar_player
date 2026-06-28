# mqtt-topic-display-name-authoring Specification

## Purpose

TBD - created by archiving change 'mqtt-topic-custom-display-names'. Update Purpose after archive.

## Requirements

### Requirement: Operators can author custom display names per topic mapping

The system SHALL let operators edit a custom Chinese display name and a custom English display name for each topic mapping in the MQTT Settings Topic workspace. Each topic mapping SHALL expose `nameZh` and `nameEn` fields that are editable in the workspace and persisted through the existing topics draft-save flow keyed by `metric_key`.

#### Scenario: Edit and persist custom names

- **WHEN** an operator edits the Chinese name and English name fields of a topic card and saves the topics draft
- **THEN** the system persists both names against that mapping's `metric_key`
- **AND** reloading the Topic workspace shows the saved Chinese and English names in their fields

#### Scenario: Empty name fields are stored as unset

- **WHEN** an operator leaves the Chinese name or English name field empty and saves
- **THEN** the system stores that name as unset (null) rather than an empty display string

#### Scenario: Saving other fields preserves existing names

- **WHEN** a topics save request does not include a name value for an existing mapping
- **THEN** the system preserves the mapping's previously saved Chinese and English names

##### Example: name persistence and preservation

| Saved nameZh | Saved nameEn | Next save includes name? | Stored nameZh after next save |
| ------------ | ------------ | ------------------------ | ----------------------------- |
| "生產線用電" | "Production" | no (other field changed) | "生產線用電" (preserved)      |
| "生產線用電" | "Production" | yes, nameZh="" | null (cleared)                |
| null         | null         | yes, nameZh="廠區照明" | "廠區照明"                    |


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
### Requirement: Topic mapping API carries custom display names

The system SHALL include `nameZh` and `nameEn` on each topic object returned by the MQTT topics read endpoint, and SHALL accept optional `nameZh` and `nameEn` on each topic input of the topics write endpoint, without changing the existing response envelope shape.

#### Scenario: Read endpoint returns names

- **WHEN** a trusted management client reads the MQTT topics endpoint
- **THEN** each returned topic object includes `nameZh` and `nameEn` fields reflecting stored values or null

#### Scenario: Write endpoint accepts names

- **WHEN** a topics write request includes `nameZh` and `nameEn` on a topic input
- **THEN** the system stores those values for the matching `metric_key`

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