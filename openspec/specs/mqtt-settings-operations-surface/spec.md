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
### Requirement: MQTT operations are a focused Data Hub source subdomain

The existing MQTT broker/topic management capability SHALL be presented within Data Hub as the infrastructure and generic-MQTT-source portion of the data workflow. It SHALL preserve direct broker and generic topic mapping operations while directing operators to semantic Metrics/Usage/Diagnostics for downstream display impact and to External Data for non-MQTT integrations.

#### Scenario: Operator edits a generic MQTT mapping
- **WHEN** an operator opens the MQTT Sources area from Data Hub
- **THEN** existing editable topic mapping fields and broker-aware health feedback remain available
- **AND** the workspace links the mapping to its semantic metric/scope and downstream usage where known
- **AND** Weather configuration is not embedded as another MQTT mapping section


<!-- @trace
source: improve-data-management-workflows
updated: 2026-08-31
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DataHub/WeatherModel.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/tray/logfile.go
  - apps/web/src/pages/DataHub/Metrics.tsx
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/server/src/server-startup.ts
  - apps/web/src/app/dataHubCompatibility.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/db/migrate.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - start.ps1
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/web/src/pages/DeviceStatus/formatters.ts
  - apps/web/src/pages/DeviceStatus/localization.ts
  - solar_mqtt_go/internal/display/display.go
  - apps/server/src/routes/metric-provenance.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/DataHub/DerivedMetrics.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/derivedMetric.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/config/config.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - packages/shared/src/playbackMetricContract.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/routes/metrics-inventory.ts
  - apps/web/src/pages/DataHub/CardDataDiagnosticsModel.ts
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - .agents/skills/openspec-apply-change/SKILL.md
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/services/safeDiagnosticText.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperationsView.tsx
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/services/metricUsageService.ts
  - apps/web/src/pages/DataHub/Usage.tsx
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - apps/server/src/routes/calculation-settings.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - solar_mqtt_go/build.ps1
  - apps/server/src/routes/metric-usage.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/web/src/pages/DataHub/UsageModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/server/src/services/metricInventoryService.ts
  - apps/web/src/pages/DeviceStatus/RightWingMetricsPanel.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/displayReadiness.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/web/src/pages/DataHub/DiagnosticsModel.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DeviceStatus/LeftWingTriagePanel.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/DataHub/MetricsModel.ts
  - start.sh
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/start.sh
  - apps/server/src/routes/derived-metrics.ts
  - solar_mqtt_go/go.mod
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - apps/web/src/pages/DataHub/index.tsx
  - apps/server/src/services/displayPreviewContextService.ts
  - packages/shared/src/metricScope.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - apps/server/src/app.ts
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/web/src/pages/DataHub/links.ts
  - apps/web/src/pages/DataHub/Diagnostics.tsx
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/services/deviceGroupService.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/DataHub/Weather.tsx
  - apps/server/src/routes/metrics.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - solar_mqtt_go/internal/webui/web/index.html
  - apps/web/src/pages/DataHub/placeholder.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt_go/build.sh
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - solar_mqtt_go/go.sum
  - apps/web/src/pages/DataHub/CardDataDiagnostics.tsx
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/web/src/pages/DataHub/liveActivity.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - solar_mqtt_go/main.go
  - packages/shared/src/widgetDataBinding.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - packages/shared/src/displayOps.ts
  - solar_mqtt_go/internal/storage/storage.go
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - apps/web/src/app/dataHub.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/assets/tray.ico
  - apps/web/src/pages/DataHub/sectionState.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/internal/tray/run.go
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/metricProvenanceService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/deviceCredentialService.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/server/src/routes/data-source.ts
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - solar_mqtt_go/start.ps1
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/tray/app.go
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - solar_mqtt_go/internal/scraper/scraper.go
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/web/src/pages/DataHub/Diagnostics.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/derivedMetric.test.ts
  - apps/web/src/pages/DataHub/sectionState.test.tsx
  - apps/web/src/pages/DataHub/UsageModel.test.ts
  - apps/server/src/routes/playback.test.ts
  - solar_mqtt_go/build_test.go
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/DataHub/links.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - packages/shared/src/metricScope.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/app.test.ts
  - solar_mqtt_go/internal/service/service_test.go
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DataHub/DerivedMetrics.test.tsx
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/web/src/pages/DataHub/Sources.test.tsx
  - apps/server/src/routes/metrics-inventory.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DataHub/CardDataDiagnostics.test.tsx
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - solar_mqtt_go/internal/config/applyset_test.go
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/DataHub/DiagnosticsModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/routes/metric-usage.test.ts
  - packages/shared/src/displayStory.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/routes/metric-provenance.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - apps/web/src/app/dataHub.test.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/app/dataHubCompatibility.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - solar_mqtt_go/main_test.go
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DataHub/WeatherModel.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/web/src/pages/DataHub/Metrics.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/web/src/pages/DataHub/Usage.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
-->

---
### Requirement: MQTT mapping rows display explicit metric scope and ownership

Each generic MQTT mapping row/detail SHALL identify its metric scope and whether the target metric identity is operator-managed or reserved by a managed source/derived registry. Attempts to edit a reserved identity SHALL surface the stable ownership conflict rather than allowing a competing writer.

#### Scenario: Operator inspects two same-key mappings
- **WHEN** CL and KN generic mappings both target `factoryCircuit.stampingPower`
- **THEN** the rows remain distinguishable by CL and KN scope
- **AND** each row shows its own topic/activity/provenance state


<!-- @trace
source: improve-data-management-workflows
updated: 2026-08-31
code:
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/web/src/pages/DataHub/WeatherModel.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - .agents/skills/.openspec-target
  - solar_mqtt_go/internal/tray/logfile.go
  - apps/web/src/pages/DataHub/Metrics.tsx
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/server/src/server-startup.ts
  - apps/web/src/app/dataHubCompatibility.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/db/migrate.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - start.ps1
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/web/src/pages/DeviceStatus/formatters.ts
  - apps/web/src/pages/DeviceStatus/localization.ts
  - solar_mqtt_go/internal/display/display.go
  - apps/server/src/routes/metric-provenance.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/DataHub/DerivedMetrics.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/derivedMetric.ts
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - solar_mqtt_go/internal/config/config.go
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - packages/shared/src/playbackMetricContract.ts
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/server/src/routes/metrics-inventory.ts
  - apps/web/src/pages/DataHub/CardDataDiagnosticsModel.ts
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - .agents/skills/openspec-apply-change/SKILL.md
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/services/safeDiagnosticText.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperationsView.tsx
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/services/metricUsageService.ts
  - apps/web/src/pages/DataHub/Usage.tsx
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/server/src/db/scopedMetricMigration.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - apps/server/src/routes/calculation-settings.ts
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - solar_mqtt_go/build.ps1
  - apps/server/src/routes/metric-usage.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/webui/web/js/app.js
  - apps/web/src/pages/DataHub/UsageModel.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/server/src/services/metricInventoryService.ts
  - apps/web/src/pages/DeviceStatus/RightWingMetricsPanel.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - packages/shared/src/displayReadiness.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/web/src/pages/DataHub/DiagnosticsModel.ts
  - packages/shared/src/displayStory.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/server/src/services/displayValueOverrideService.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DeviceStatus/LeftWingTriagePanel.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/routes/display-card-data.ts
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/DataHub/MetricsModel.ts
  - start.sh
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - packages/shared/src/displayCardData.ts
  - solar_mqtt_go/start.sh
  - apps/server/src/routes/derived-metrics.ts
  - solar_mqtt_go/go.mod
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - solar_mqtt_go/internal/mqttbus/bus.go
  - apps/web/src/pages/DataHub/index.tsx
  - apps/server/src/services/displayPreviewContextService.ts
  - packages/shared/src/metricScope.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - solar_mqtt_go/internal/tray/instance_unix.go
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - apps/server/src/app.ts
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - apps/server/src/services/MetricResolver.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - apps/web/src/pages/DataHub/links.ts
  - apps/web/src/pages/DataHub/Diagnostics.tsx
  - solar_mqtt_go/assets/assets.go
  - apps/server/src/services/deviceGroupService.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/DataHub/Weather.tsx
  - apps/server/src/routes/metrics.ts
  - .env.example
  - apps/server/src/services/householdEquivalenceService.ts
  - solar_mqtt_go/internal/webui/web/index.html
  - apps/web/src/pages/DataHub/placeholder.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - solar_mqtt_go/build.sh
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - solar_mqtt_go/go.sum
  - apps/web/src/pages/DataHub/CardDataDiagnostics.tsx
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/web/src/pages/DataHub/liveActivity.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - solar_mqtt_go/main.go
  - packages/shared/src/widgetDataBinding.ts
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - packages/shared/src/displayOps.ts
  - solar_mqtt_go/internal/storage/storage.go
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/hooks/liveMetricsStore.ts
  - packages/shared/src/index.ts
  - solar_mqtt_go/commands.go
  - solar_mqtt_go/internal/service/service.go
  - apps/web/src/app/dataHub.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - solar_mqtt_go/assets/tray.ico
  - apps/web/src/pages/DataHub/sectionState.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - solar_mqtt_go/internal/tray/run.go
  - apps/server/src/services/displayRotationService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/metricProvenanceService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/deviceCredentialService.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/server/src/routes/data-source.ts
  - .agents/skills/openspec-propose/SKILL.md
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - solar_mqtt_go/start.ps1
  - scripts/deploy.test.mjs
  - solar_mqtt_go/internal/webui/webui.go
  - solar_mqtt_go/internal/tray/app.go
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - solar_mqtt_go/internal/scraper/scraper.go
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/web/src/pages/DataHub/Diagnostics.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/derivedMetric.test.ts
  - apps/web/src/pages/DataHub/sectionState.test.tsx
  - apps/web/src/pages/DataHub/UsageModel.test.ts
  - apps/server/src/routes/playback.test.ts
  - solar_mqtt_go/build_test.go
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/DataHub/links.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - packages/shared/src/metricScope.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/server/src/app.test.ts
  - solar_mqtt_go/internal/service/service_test.go
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DataHub/DerivedMetrics.test.tsx
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/web/src/pages/DataHub/Sources.test.tsx
  - apps/server/src/routes/metrics-inventory.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - solar_mqtt_go/internal/tray/app_test.go
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DataHub/CardDataDiagnostics.test.tsx
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - solar_mqtt_go/internal/config/applyset_test.go
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/server/src/routes/device-group-management.test.ts
  - apps/web/src/pages/DataHub/DiagnosticsModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - solar_mqtt_go/assets/assets_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/routes/metric-usage.test.ts
  - packages/shared/src/displayStory.test.ts
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/server/src/routes/metric-provenance.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - apps/web/src/app/dataHub.test.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/app/dataHubCompatibility.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - solar_mqtt_go/main_test.go
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - apps/server/src/routes/display-card-data.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DataHub/WeatherModel.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/web/src/pages/DataHub/Metrics.test.tsx
  - apps/web/src/components/AppHeader.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - apps/web/src/pages/DataHub/Usage.test.tsx
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
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