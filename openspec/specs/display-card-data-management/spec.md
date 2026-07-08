# display-card-data-management Specification

## Purpose

TBD - created by archiving change 'add-topic-workspace-card-data-management'. Update Purpose after archive.

## Requirements

### Requirement: Present card-centric data diagnostics in the MQTT Topic workspace

The system SHALL present card-centric data diagnostics in the `Card Data Management` tab of the MQTT Topic workspace for requested numeric playback cards.

#### Scenario: Operator reviews cards that depend on runtime data

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list value-bearing playback cards with page identity, card identity, metric identity, current displayed value, unit, source classification, source topics, required inputs, formula or aggregate description, and last update
- **AND** the operator SHALL NOT need to infer missing card data only from playback tooltips or topic rows

##### Example: Solar self-consumption ratio identifies both required inputs

- **GIVEN** the self-consumption ratio uses `selfConsumptionEnergy` and `consumptionEnergy`
- **WHEN** the operator reviews that card in `Card Data Management`
- **THEN** the row lists both required inputs and the topic mapping status for each mapped input

#### Scenario: Sustainability numeric cards are listed

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list Sustainability numeric display cards such as accumulated generation, accumulated carbon reduction, annual energy-saving percent, planted tree equivalent, and household-equivalent cards
- **AND** each listed row SHALL expose source provenance, display value, original value, and display-only override action

#### Scenario: Factory Circuit engineering slot power values are listed

- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list Factory Circuit engineering slot power values for configured display slots
- **AND** each slot row SHALL expose the engineering label, slot metric key, source topic state, latest live value, and display-only override action

#### Scenario: Diagnostics classify unavailable values

- **WHEN** a card has no displayable numeric value
- **THEN** the system SHALL classify the unavailable state as `missing-topic`, `idle-topic`, `waiting-aggregate`, `formula-input-missing`, or `manual-only`
- **AND** the system SHALL expose the next available action for that classification

##### Example: Sustainability household card waits for aggregate input

- **GIVEN** the daily household card depends on daily self-consumption summary data
- **AND** the summary has not been produced for the current day
- **WHEN** the operator reviews that card in `Card Data Management`
- **THEN** the row status is `waiting-aggregate`
- **AND** the row names the upstream self-consumption metric that feeds the aggregate


<!-- @trace
source: expand-card-data-numeric-coverage
updated: 2026-07-08
code:
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayCardDataService.ts
  - packages/shared/src/displayCardData.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - deploy/tailscale-hotspot-trigger.timer
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/Overview/viewModel.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/services/api.ts
  - deploy/configure-lightweight-desktop.sh
  - deploy/tailscale-hotspot-trigger.sh
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy.sh
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/app.ts
  - .env.example
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayStory.ts
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
-->

---
### Requirement: Provide data completion actions from card diagnostics

The system SHALL provide data completion actions from each card diagnostic row according to the row source classification.

#### Scenario: Card depends on an editable MQTT metric

- **WHEN** a card diagnostic row depends on a metric that has an MQTT topic mapping
- **THEN** the system SHALL provide an action to publish a numeric test value to that mapped topic
- **AND** the action SHALL use the existing MQTT topic publish path for the metric mapping

##### Example: Factory slot publishes through its mapped topic

- **GIVEN** `factoryStampingPower` maps to `kuozui/factory/stamping/power`
- **WHEN** the operator publishes `168` from the stamping slot diagnostic row
- **THEN** the system publishes payload `168` to `kuozui/factory/stamping/power`


<!-- @trace
source: expand-card-data-numeric-coverage
updated: 2026-07-08
code:
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayCardDataService.ts
  - packages/shared/src/displayCardData.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - deploy/tailscale-hotspot-trigger.timer
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/Overview/viewModel.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/services/api.ts
  - deploy/configure-lightweight-desktop.sh
  - deploy/tailscale-hotspot-trigger.sh
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy.sh
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/app.ts
  - .env.example
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayStory.ts
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
-->

---
### Requirement: Persist display-only card value overrides separately from true data

The system SHALL persist display-only card value overrides separately from MQTT messages, live metric values, daily summaries, and cumulative counters.

#### Scenario: Operator applies a display override

- **WHEN** the operator applies an override for a supported card target
- **THEN** playback story payloads SHALL use the override display value for that target
- **AND** diagnostics SHALL preserve the original source value and mark the target as `overridden`
- **AND** the system SHALL NOT write the override value into raw MQTT ingestion, live metric storage, daily summaries, or cumulative counters

##### Example: Override changes a card without changing its source metric

- **GIVEN** `todayGeneration` source value is `120.5 kWh`
- **WHEN** the operator applies an override value of `168 kWh` for the corresponding display card
- **THEN** playback receives `168 kWh` for that card display target
- **AND** diagnostics still report the original source value as `120.5 kWh`

#### Scenario: Operator clears a display override

- **WHEN** the operator clears an active override for a supported card target
- **THEN** playback story payloads SHALL return to the real source or computed value
- **AND** the override record SHALL no longer be applied to the display payload

##### Example: Cleared override restores today generation source value

- **GIVEN** `todayGeneration` source value is `120.5 kWh`
- **AND** an active override displays `168 kWh`
- **WHEN** the operator clears the override
- **THEN** playback receives `120.5 kWh` for that card display target

#### Scenario: Override input is invalid

- **WHEN** the operator submits an override with a non-numeric value for a numeric target
- **THEN** the system SHALL reject the override with a validation error
- **AND** the existing display value SHALL remain unchanged

##### Example: Text override is rejected for a numeric target

- **GIVEN** the target card accepts numeric kWh values
- **WHEN** the operator submits `good looking`
- **THEN** the system returns a validation error
- **AND** the active display value remains unchanged

<!-- @trace
source: add-topic-workspace-card-data-management
updated: 2026-07-08
code:
  - deploy/configure-lightweight-desktop.sh
  - .env.example
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy/tailscale-hotspot-trigger.timer
  - scripts/deploy.test.mjs
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy/tailscale-hotspot-trigger.sh
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/server/src/app.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - packages/shared/src/index.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
-->

---
### Requirement: Keep Card Data Management input labels readable

The system SHALL render Card Data Management numeric input labels horizontally.

#### Scenario: Operator reviews override and publish inputs

- **WHEN** a row shows publish or display override controls
- **THEN** labels such as `測試數值` and `展示覆寫值` SHALL remain horizontal
- **AND** the fix SHALL NOT change the surrounding Topic workspace card layout

<!-- @trace
source: expand-card-data-numeric-coverage
updated: 2026-07-08
code:
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/server/src/services/displayValueOverrideService.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/services/displayCardDataService.ts
  - packages/shared/src/displayCardData.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - deploy/tailscale-hotspot-trigger.timer
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/Overview/viewModel.ts
  - deploy/disable-xfce-display-popups.sh
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/services/api.ts
  - deploy/configure-lightweight-desktop.sh
  - deploy/tailscale-hotspot-trigger.sh
  - apps/server/src/db/migrations/018_display_value_overrides.sql
  - deploy.sh
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/server/src/app.ts
  - .env.example
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayStory.ts
tests:
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
-->