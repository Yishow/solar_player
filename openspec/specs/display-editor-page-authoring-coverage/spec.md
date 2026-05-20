# display-editor-page-authoring-coverage Specification

## Purpose

TBD - created by archiving change 'expand-display-page-editor-page-specific-authoring-coverage'. Update Purpose after archive.

## Requirements

### Requirement: Provide page-specific authoring coverage for supported display pages

The system SHALL provide page-specific authoring coverage for supported display pages that currently stop at preview-only coverage.

#### Scenario: Operator opens a page that previously had preview-only coverage

- **WHEN** the operator switches to a supported display page in `Display Pages Editor`
- **THEN** the editor SHALL expose page-specific editable regions and typed fields for that page
- **AND** the operator SHALL NOT see only a generic fallback message when page-specific authoring support now exists


<!-- @trace
source: expand-display-page-editor-page-specific-authoring-coverage
updated: 2026-05-20
code:
  - apps/web/src/hooks/usePlaybackController.ts
  - AGENTS.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - CLAUDE.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - package.json
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/logger.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
tests:
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->

---
### Requirement: Keep page-specific authoring bound to the current draft session

The system SHALL keep new page-specific authoring controls bound to the current display-page draft session.

#### Scenario: Operator edits a page-specific field

- **WHEN** the operator updates a page-specific field from the inspector
- **THEN** the change SHALL remain part of the current draft session
- **AND** it SHALL participate in the existing save, reset, and preview-binding workflows

##### Example: Sustainability card title stays in the active draft

- **GIVEN** the operator is editing `sustainability` in `Display Pages Editor`
- **WHEN** they update a page-specific card title field from the inspector
- **THEN** the new title remains attached to the current draft session
- **AND** preview, save, and reset flows all reflect that draft-scoped value instead of dropping back to the previous published state

<!-- @trace
source: expand-display-page-editor-page-specific-authoring-coverage
updated: 2026-05-20
code:
  - apps/web/src/hooks/usePlaybackController.ts
  - AGENTS.md
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - CLAUDE.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - package.json
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/server/src/logger.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
tests:
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->