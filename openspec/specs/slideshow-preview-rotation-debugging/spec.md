# slideshow-preview-rotation-debugging Specification

## Purpose

TBD - created by archiving change 'promote-slideshow-preview-to-rotation-debug-surface'. Update Purpose after archive.

## Requirements

### Requirement: Show effective rotation debugging in Slideshow Preview

The system SHALL show effective rotation debugging details in `Slideshow Preview` alongside the visual playback preview.

#### Scenario: Some configured pages are skipped

- **WHEN** the current rotation state skips one or more configured pages
- **THEN** `Slideshow Preview` SHALL show the effective playable sequence and the skipped pages separately
- **AND** it SHALL preserve the machine-readable skip semantics already used by the rotation diagnostics surfaces


<!-- @trace
source: promote-slideshow-preview-to-rotation-debug-surface
updated: 2026-05-20
code:
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - AGENTS.md
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - scripts/dev.mjs
  - package.json
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
tests:
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
-->

---
### Requirement: Surface fallback route context in Slideshow Preview

The system SHALL surface fallback route context in `Slideshow Preview` when playback is operating under a fallback or degraded rotation state.

#### Scenario: No page can play and fallback routing is active

- **WHEN** the rotation state falls back to an offline route or other fallback destination
- **THEN** `Slideshow Preview` SHALL show that fallback route as part of the preview debug state
- **AND** the page SHALL not present the current preview as if it came from a fully healthy rotation sequence

<!-- @trace
source: promote-slideshow-preview-to-rotation-debug-surface
updated: 2026-05-20
code:
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - AGENTS.md
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - scripts/dev.mjs
  - package.json
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
tests:
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
-->