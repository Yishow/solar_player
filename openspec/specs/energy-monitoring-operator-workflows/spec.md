# energy-monitoring-operator-workflows Specification

## Purpose

TBD - created by archiving change 'productize-energy-monitoring-surfaces-for-operators'. Update Purpose after archive.

## Requirements

### Requirement: Expose freshness and source state on energy monitoring surfaces

The system SHALL expose freshness and source state on `Energy Trend` and `Energy History` so operators can tell whether the visible values are live, historical, cumulative, stale, or degraded.

#### Scenario: Monitoring surface renders degraded data

- **WHEN** a monitoring surface must render without a fully fresh upstream source
- **THEN** the page SHALL identify the degraded or stale state explicitly
- **AND** it SHALL distinguish the current source role instead of presenting the values as fully fresh live data

##### Example: Trend page falls back to stale cumulative telemetry

- **GIVEN** the live MQTT feed has stopped updating but the last cumulative telemetry snapshot is still available
- **WHEN** the operator opens `Energy Trend`
- **THEN** the page labels the visible values as stale or degraded
- **AND** it distinguishes that the chart is rendering from cumulative fallback data instead of fully live values


<!-- @trace
source: productize-energy-monitoring-surfaces-for-operators
updated: 2026-05-20
code:
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - CLAUDE.md
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - AGENTS.md
  - packages/shared/src/displayOps.ts
  - apps/server/src/logger.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->

---
### Requirement: Keep empty and degraded monitoring states consistent across trend and history

The system SHALL keep empty, error, and degraded monitoring semantics consistent across `Energy Trend` and `Energy History`.

#### Scenario: No usable history is available

- **WHEN** the monitoring surface lacks usable data for the selected range or source role
- **THEN** the page SHALL show a clear empty or degraded state
- **AND** the same state category SHALL mean the same thing on both energy monitoring pages

##### Example: History page has no annual records for the selected source

- **GIVEN** the operator selects a year and source role that have no persisted history rows
- **WHEN** `Energy History` loads that range
- **THEN** the page shows the shared empty or degraded state instead of a misleading zero-filled summary
- **AND** the same state category matches what `Energy Trend` would show for the same missing dataset condition

<!-- @trace
source: productize-energy-monitoring-surfaces-for-operators
updated: 2026-05-20
code:
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - CLAUDE.md
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - AGENTS.md
  - packages/shared/src/displayOps.ts
  - apps/server/src/logger.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->