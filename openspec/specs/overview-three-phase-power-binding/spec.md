# overview-three-phase-power-binding Specification

## Purpose

TBD - created by archiving change 'align-overview-better-dashboard-closeout'. Update Purpose after archive.

## Requirements

### Requirement: Define three-phase power metric keys

The system SHALL define nine first-class metric keys for three-phase power readings: `phaseRVoltage`, `phaseRCurrent`, `phaseRPower`, `phaseSVoltage`, `phaseSCurrent`, `phaseSPower`, `phaseTVoltage`, `phaseTCurrent`, and `phaseTPower`. Each key SHALL resolve to a non-empty human-readable metric label so it can be presented as a manageable tag.

#### Scenario: Three-phase keys are first-class metrics

- **WHEN** the system enumerates available metric keys
- **THEN** the nine three-phase power keys are present and each resolves to a non-empty label

##### Example: phase R voltage label

- **GIVEN** the metric key `phaseRVoltage`
- **WHEN** its label is resolved
- **THEN** the label is non-empty and identifies the R-phase voltage reading


<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->

---
### Requirement: Manage three-phase tags on the MQTT settings surface

The MQTT settings surface SHALL allow an operator to create, link, enable, and disable a topic mapping (tag) for each three-phase power metric key, using the same topic-mapping shape and workflow as existing metrics. The mapping `metricKey` SHALL equal the exact three-phase key string so ingestion persists the value under that key.

#### Scenario: Operator creates a three-phase tag

- **WHEN** an operator creates a topic mapping with `metricKey` set to a three-phase key, a broker topic, and an enabled flag
- **THEN** the mapping is persisted and listed alongside existing metric mappings

#### Scenario: Disabled three-phase tag is not ingested

- **WHEN** a three-phase topic mapping is disabled
- **THEN** incoming messages for its topic SHALL NOT update the corresponding live metric value


<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->

---
### Requirement: Surface three-phase readings to the Overview phase power widget

When live three-phase metric values are present in the snapshot, the Overview three-phase power widget SHALL render the corresponding R/S/T voltage, current, and power values. When a reading is absent, the widget SHALL render the `--` placeholder for that field without rendering `NaN` or `undefined`, and SHALL NOT render mock values.

#### Scenario: Populated three-phase readings render real values

- **WHEN** the live snapshot contains voltage, current, and power readings for phases R, S, and T
- **THEN** the three-phase power widget renders those values in their R/S/T rows

##### Example: R-phase row values

- **GIVEN** snapshot readings `phaseRVoltage=220.5`, `phaseRCurrent=12.3`, `phaseRPower=2.70`
- **WHEN** the widget renders the R row
- **THEN** it shows voltage `220.5`, current `12.3`, and power `2.70`

#### Scenario: Missing readings fall back without mock content

- **WHEN** no three-phase readings are present in the snapshot
- **THEN** every three-phase field renders `--`, and no mock value (such as a fixed demo number) appears


<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->

---
### Requirement: Bind the generation trend widget to runtime trend data

The Overview generation trend widget SHALL render from the runtime-provided `realTimePower` trend series exposed by the view model. When no runtime trend data is available, the widget SHALL render its empty state rather than mock content.

#### Scenario: Runtime trend renders the area sparkline

- **WHEN** the view model exposes a non-empty `realTimePower` trend series
- **THEN** the generation trend widget renders the area sparkline from that series

#### Scenario: Absent trend renders the empty state

- **WHEN** the view model exposes no `realTimePower` trend series
- **THEN** the generation trend widget renders its empty state and no sparkline

<!-- @trace
source: align-overview-better-dashboard-closeout
updated: 2026-06-08
code:
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/vite.config.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/components/displayPageCards.css
  - .env.example
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/components/management/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/server/src/app.ts
  - apps/web/src/components/management/CustomSelect.tsx
  - apps/web/src/pages/PlaybackSettings/playbackSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/EnergyHistory/history.css
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/backgroundPool.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - apps/web/src/components/management/RemoteSyncBanner.tsx
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/styles/management.css
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/device.css
  - apps/web/src/pages/Overview/assets.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - apps/web/src/styles/tokens.css
  - scripts/dev-lib.d.mts
  - scripts/dev.test.mjs
  - apps/web/src/components/displayPageCards.tsx
  - apps/web/index.html
  - apps/web/src/pages/EnergyTrend/trend.css
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
tests:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/components/management/RemoteSyncBanner.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Overview/widgetStyles.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/backgroundPlacement.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/management/CustomSelect.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/Overview/backgroundPoolConfig.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/backgroundPool.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Overview/kpiFooter.test.tsx
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/web/src/pages/Overview/render.test.ts
-->