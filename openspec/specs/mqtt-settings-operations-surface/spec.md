# mqtt-settings-operations-surface Specification

## Purpose

TBD - created by archiving change 'complete-mqtt-settings-operations-surface'. Update Purpose after archive.

## Requirements

### Requirement: Present MQTT topic governance with display-impact-aware workspace summaries

The system SHALL present MQTT topic governance with display-impact-aware workspace summaries in `MQTT Settings`.

#### Scenario: Operator reviews mappings for affected display stories

- **WHEN** the operator opens the topic workspace
- **THEN** the page SHALL show which mappings or gaps affect which display stories or metric families
- **AND** the operator SHALL NOT need to infer impact only from a flat list of topic rows

#### Scenario: Topic row remains editable while workspace summary highlights priority

- **WHEN** the operator edits one topic row inside the workspace
- **THEN** the row SHALL remain directly editable
- **AND** the surrounding workspace SHALL still communicate whether the issue is an idle runtime, a mapping gap, or a healthy mapping


<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->

---
### Requirement: Show section-level draft and runtime guidance across broker, topic, and weather areas

The system SHALL show section-level draft and runtime guidance across broker, topic, and weather areas.

#### Scenario: One section has unsaved changes while another section is runtime-healthy

- **WHEN** an operator changes weather or topic settings without saving
- **THEN** the page SHALL identify which section carries the unsaved scope
- **AND** it SHALL keep unrelated runtime-healthy sections readable without implying they are also dirty

#### Scenario: Broker and topic runtime remain explicit during token alignment

- **WHEN** the broker disconnects or a mapped topic becomes idle
- **THEN** the page SHALL preserve explicit broker and runtime feedback hierarchy
- **AND** the aligned surface SHALL NOT collapse those states into ambiguous neutral panels


<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->

---
### Requirement: Treat weather configuration as an effective header contract

The system SHALL treat weather configuration as an effective header contract in `MQTT Settings`.

#### Scenario: Operator changes preset or location inputs

- **WHEN** the operator changes weather preset, county, station, or custom field selection
- **THEN** the page SHALL show the resulting effective header preview and any validation feedback in the same weather workspace

#### Scenario: Invalid or incomplete weather selection is visible before save

- **WHEN** the selected county, station, or preset configuration is invalid or incomplete
- **THEN** the weather workspace SHALL show explicit validation feedback
- **AND** the operator SHALL be able to understand how the current draft differs from a valid effective header outcome

<!-- @trace
source: complete-mqtt-settings-operations-surface
updated: 2026-05-29
code:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - docs/goal.md
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/CircuitSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - .agents/skills/spectra-verify/SKILL.md
  - apps/web/src/pages/EnergyTrend/layout.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - .agents/skills/spectra-analyze/SKILL.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md
  - apps/web/src/components/management/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/Overview/assets/overview-leaf-cluster-reference.png
  - apps/web/src/pages/Overview/assets/overview-leaf-reference-crop.png
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - data/server-runtime.lock.json
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/components/management/rotationOpsSummary.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/EnergyHistory/layout.ts
  - apps/web/src/pages/SlideshowPreview/layout.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/components/management/rotationOpsSummary.test.tsx
  - apps/web/src/pages/EnergyHistory/layout.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/layout.test.ts
  - apps/web/src/pages/SlideshowPreview/layout.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
-->

---
### Requirement: Publish numeric test values through existing MQTT topic mappings

The system SHALL let operators publish numeric test values from MQTT Settings through existing topic mappings without allowing arbitrary topic or payload publishing.

#### Scenario: Operator publishes a test value for an enabled mapping

- **WHEN** an operator enters `1200` for the `selfConsumptionEnergy` topic row and triggers test publish
- **THEN** the server SHALL publish the JSON payload `{ "value": 1200 }` to that row's configured MQTT topic
- **AND** the response SHALL identify the metric key, topic, payload, and current MQTT status

#### Scenario: Operator publishes a self-consumption dependency value

- **WHEN** an operator enters a numeric value for either `selfConsumptionEnergy` or `consumptionEnergy`
- **THEN** MQTT Settings SHALL use that row's configured topic mapping for publish
- **AND** the operator SHALL NOT need to type a custom topic or tag outside the mapping row

#### Scenario: Publish is rejected when the mapping is not publishable

- **WHEN** the requested metric key has no mapping, has a disabled mapping, has an empty topic, or the MQTT client is not connected
- **THEN** the server MUST reject the request with a non-2xx response
- **AND** MQTT Settings SHALL show the rejection message instead of reporting success

#### Scenario: Publish is rejected for invalid values

- **WHEN** the operator submits an empty value, non-numeric value, `NaN`, or an infinite number
- **THEN** the server MUST reject the request
- **AND** no MQTT payload SHALL be published

<!-- @trace
source: add-mqtt-topic-test-publish-and-card-source-tooltips
updated: 2026-07-08
code:
  - deploy/disable-xfce-display-popups.sh
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - deploy.sh
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - deploy/tailscale-hotspot-trigger.service
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - scripts/deploy.test.mjs
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/tailscale-hotspot-trigger.sh
  - .env.example
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/src/pages/AssetLibrary/assetLibrary.css
  - apps/web/src/styles/management.css
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - deploy/configure-lightweight-desktop.sh
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - deploy/tailscale-hotspot-trigger.timer
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/components/displayPageCards.test.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Combine MQTT source mode and topic controls into a three-tab Topic workspace

The system SHALL combine MQTT source mode controls and topic mapping controls into one Topic workspace with three tabs.

#### Scenario: Operator opens the merged Topic workspace

- **WHEN** the operator opens `/settings/mqtt`
- **THEN** the page SHALL present one Topic workspace container for MQTT source mode, topic mapping, and card data management
- **AND** the workspace SHALL expose exactly three tabs named `資料來源模式`, `Topic mapping`, and `卡片資料管理`
- **AND** the page SHALL NOT render MQTT source mode as a separate card outside the Topic workspace

#### Scenario: Operator switches to source mode tab

- **WHEN** the operator selects `資料來源模式`
- **THEN** the workspace SHALL show the MQTT data mode control, broker fields, connection status, test connection action, and save settings action
- **AND** existing broker runtime feedback SHALL remain visible inside the selected tab

#### Scenario: Operator switches to topic mapping tab

- **WHEN** the operator selects `Topic mapping`
- **THEN** the workspace SHALL show topic coverage findings, topic rows, add mapping, reload mappings, save mappings, and numeric topic publish controls
- **AND** existing topic row edit behavior SHALL remain available inside the selected tab

#### Scenario: Operator switches to card data management tab

- **WHEN** the operator selects `卡片資料管理`
- **THEN** the workspace SHALL show card-centric diagnostics and display override controls
- **AND** the workspace SHALL preserve unsaved broker and topic draft indicators when the operator changes tabs


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
### Requirement: Preserve MQTT management actions across tab navigation

The system SHALL preserve MQTT management action state across Topic workspace tab navigation.

#### Scenario: Operator edits a topic and changes tabs before saving

- **WHEN** the operator edits a topic mapping field and switches to another Topic workspace tab
- **THEN** the unsaved topic draft SHALL remain intact
- **AND** the workspace SHALL continue to identify the topic section as dirty

##### Example: Topic edit survives switching to card data management

- **GIVEN** the operator changes `realTimePower` topic from `kuozui/plant/solar/power` to `demo/solar/power`
- **WHEN** the operator switches from `Topic mapping` to `卡片資料管理` and back
- **THEN** the `realTimePower` row still contains `demo/solar/power`
- **AND** the topic section remains marked as dirty

#### Scenario: Operator tests broker connection from source mode tab

- **WHEN** the operator runs the MQTT connection test from `資料來源模式`
- **THEN** the result SHALL appear in the merged workspace
- **AND** switching tabs SHALL NOT clear the latest connection feedback

#### Scenario: Operator publishes a topic value from either data workflow

- **WHEN** the operator publishes a numeric value from `Topic mapping` or from a card diagnostic action
- **THEN** the publish request SHALL target the existing topic mapping for that metric key
- **AND** the publish result SHALL be visible without forcing a full page reload

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