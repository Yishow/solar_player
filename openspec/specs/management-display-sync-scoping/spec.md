# management-display-sync-scoping Specification

## Purpose

TBD - created by archiving change 'scope-management-display-sync-refresh-and-draft-banners'. Update Purpose after archive.

## Requirements

### Requirement: Refresh management surfaces only for relevant display sync scopes

The system SHALL refresh a management surface only when the incoming `display:sync.scope` is relevant to that surface's data domain.

#### Scenario: Unrelated display sync is ignored

- **WHEN** a management surface receives a `display:sync` event whose scope does not affect that surface's data
- **THEN** the surface SHALL ignore the event
- **AND** it SHALL NOT reload or show a remote-change warning only because another surface changed

##### Example: Brand editing ignores image-only sync

- **GIVEN** the operator is working in `Brand Assets`
- **WHEN** the app receives a `display:sync` event with the `images` scope only
- **THEN** `Brand Assets` does not reload brand data
- **AND** it does not show a pending remote-change banner for brand drafts


<!-- @trace
source: scope-management-display-sync-refresh-and-draft-banners
updated: 2026-05-20
code:
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - AGENTS.md
  - apps/web/src/pages/OfflineError/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/logger.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - package.json
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
-->

---
### Requirement: Defer only relevant remote changes while a management draft is dirty

The system SHALL defer only relevant remote changes when a management surface has an unresolved local draft.

#### Scenario: Relevant sync arrives during an unresolved draft

- **WHEN** a management surface has unsaved local edits and receives a relevant `display:sync` event
- **THEN** the surface SHALL mark a pending remote change for that draft
- **AND** unrelated scopes SHALL NOT enter the same pending state

<!-- @trace
source: scope-management-display-sync-refresh-and-draft-banners
updated: 2026-05-20
code:
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - AGENTS.md
  - apps/web/src/pages/OfflineError/viewModel.ts
  - CLAUDE.md
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/logger.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - package.json
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
tests:
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
-->