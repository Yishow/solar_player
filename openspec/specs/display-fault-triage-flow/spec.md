# display-fault-triage-flow Specification

## Purpose

TBD - created by archiving change 'complete-operator-offline-skip-readiness-triage-flow'. Update Purpose after archive.

## Requirements

### Requirement: Surface a shared triage path for offline, skip, and readiness faults

The system SHALL surface a shared triage path for offline, skip, and readiness faults across the operator-facing fault surfaces.

#### Scenario: Operator sees a skipped page caused by a blocking dependency

- **WHEN** a display page is skipped because of a readiness, stale-runtime, or unpublished fault
- **THEN** the operator-facing fault surface SHALL name the affected page and the dominant fault reason
- **AND** it SHALL identify the next management surface that best matches the repair action

##### Example: MQTT fault points to the correct repair surface

- **GIVEN** `overview` is skipped because a required MQTT mapping is missing
- **WHEN** the operator opens `Offline Error`, `Device Status`, or `Playback Settings`
- **THEN** the fault summary identifies `overview` as affected
- **AND** the triage guidance points to `MQTT Settings` as the next repair surface


<!-- @trace
source: complete-operator-offline-skip-readiness-triage-flow
updated: 2026-05-20
code:
  - apps/server/src/services/deviceDisplayOpsService.ts
  - CLAUDE.md
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - package.json
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/server/src/logger.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/BrandAssets/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
-->

---
### Requirement: Keep fault triage semantics consistent across management surfaces

The system SHALL keep fault triage semantics consistent across `Offline Error`, `Device Status`, and `Playback Settings`.

#### Scenario: Same fault appears in multiple surfaces

- **WHEN** the same display fault is rendered by multiple management surfaces
- **THEN** each surface SHALL preserve the same dominant reason and affected-page semantics
- **AND** the operator SHALL NOT need to infer a different root cause from each page

##### Example: Unpublished page fault stays consistent across surfaces

- **GIVEN** `factory-circuit` is skipped because its latest draft has not been published
- **WHEN** the operator reviews `Offline Error`, `Device Status`, and `Playback Settings`
- **THEN** each surface names the unpublished state as the dominant reason for `factory-circuit`
- **AND** none of the surfaces imply a different root cause such as device offline or stale MQTT data

<!-- @trace
source: complete-operator-offline-skip-readiness-triage-flow
updated: 2026-05-20
code:
  - apps/server/src/services/deviceDisplayOpsService.ts
  - CLAUDE.md
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - package.json
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/server/src/logger.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/BrandAssets/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
-->