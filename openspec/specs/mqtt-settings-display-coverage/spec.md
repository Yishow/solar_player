# mqtt-settings-display-coverage Specification

## Purpose

TBD - created by archiving change 'connect-mqtt-and-circuit-settings-to-display-readiness'. Update Purpose after archive.

## Requirements

### Requirement: Evaluate MQTT settings coverage against display metric requirements

The system SHALL evaluate `MQTT Settings` coverage against display metric requirements so operators can see which required metrics are mapped, missing, or invalid, and the management surface SHALL keep that feedback aligned with the latest available runtime topic state.

#### Scenario: Required display metric mapping is missing

- **WHEN** a display metric required by `Overview` or `Solar` has no valid topic mapping
- **THEN** `MQTT Settings` shows that missing or invalid mapping as a readiness finding
- **AND** the finding identifies which display story is affected
- **AND** the operator can distinguish between a static mapping gap and a mapped topic that is currently idle or not receiving runtime values


<!-- @trace
source: stream-mqtt-runtime-previews-and-readiness-feedback
updated: 2026-05-20
code:
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/settings-mqtt.ts
  - packages/shared/src/displayOps.ts
  - AGENTS.md
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
-->

---
### Requirement: Surface MQTT coverage findings inside MQTT Settings

The system SHALL surface display coverage findings inside `MQTT Settings` rather than only in a backend-only diagnostic response, and it SHALL keep those findings inside the editable topic overview workspace.

#### Scenario: Operator reviews broker and mapping page

- **WHEN** the operator opens `MQTT Settings`
- **THEN** the page can show current mapping coverage for display requirements
- **AND** blocking findings remain distinguishable from warnings
- **AND** the operator can inspect and fix the affected topic rows without leaving that same topic overview workspace

<!-- @trace
source: reorganize-mqtt-settings-topic-and-weather-management
updated: 2026-05-24
code:
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/services/weatherService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/cwaWeatherClient.ts
  - apps/server/src/routes/weather.ts
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppHeader.tsx
  - .env.example
  - packages/shared/src/weather.ts
  - apps/server/src/db/migrations/010_weather_settings.sql
  - apps/web/src/components/headerWeatherMeta.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - apps/web/src/pages/MqttSettings/layout.ts
  - apps/server/src/services/weatherSettingsService.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/server/src/config.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - AGENTS.md
tests:
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/components/headerWeatherMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/weatherService.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/services/cwaWeatherClient.test.ts
  - apps/web/src/components/AppHeader.test.ts
  - apps/server/src/routes/weather.test.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.test.ts
  - apps/server/src/services/weatherSettingsService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
-->