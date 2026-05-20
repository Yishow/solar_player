# mqtt-settings-runtime-preview-streaming Specification

## Purpose

TBD - created by archiving change 'stream-mqtt-runtime-previews-and-readiness-feedback'. Update Purpose after archive.

## Requirements

### Requirement: Stream MQTT runtime preview feedback to the management surface

The system SHALL stream MQTT runtime preview feedback to `MQTT Settings` so operators can see near-real-time topic activity and broker status.

#### Scenario: Topic starts receiving values

- **WHEN** a mapped MQTT topic starts receiving runtime values while `MQTT Settings` is open
- **THEN** the management surface SHALL reflect that topic activity without waiting for a coarse periodic reload only
- **AND** the operator SHALL be able to see that the topic is now active


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
### Requirement: Preserve a readable fallback when live MQTT preview streaming is unavailable

The system SHALL preserve a readable fallback when near-real-time MQTT preview updates are unavailable.

#### Scenario: Live preview updates are unavailable

- **WHEN** the management surface cannot receive near-real-time topic preview updates
- **THEN** it SHALL show a degraded or fallback state for the runtime preview
- **AND** it SHALL NOT present the preview as if it were fully live

##### Example: Streaming channel disconnect falls back to polled preview

- **GIVEN** `MQTT Settings` was showing live topic activity through a streaming channel
- **WHEN** the streaming connection drops while periodic preview polling still works
- **THEN** the page marks the runtime preview as degraded or fallback
- **AND** it does not continue labeling the preview as fully live until streaming resumes

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