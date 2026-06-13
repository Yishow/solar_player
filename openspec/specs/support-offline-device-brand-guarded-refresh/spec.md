# support-offline-device-brand-guarded-refresh Specification

## Purpose

TBD - created by archiving change 'support-offline-device-brand-guarded-refresh'. Update Purpose after archive.

## Requirements

### Requirement: Offline, Device Status, and Brand Assets preserve protected state during background refresh

The system SHALL preserve protected state on Offline Error, Device Status, and Brand Assets while background refresh updates other lanes.

#### Scenario: Offline Error keeps the minimal fault lane during refresh

- **WHEN** Offline Error is already showing reconnect state, return routing, and minimal fault guidance while deferred diagnostics refresh
- **THEN** the page keeps that minimal fault lane visible
- **AND** it updates only the deferred diagnostics lane in the background

##### Example: reconnect lane remains authoritative

- **GIVEN** MQTT status is disconnected with reason `reconnecting`, `returnTo` resolves to `/overview`, and retry countdown is `15`
- **WHEN** display operations diagnostics refresh in the background
- **THEN** reconnect, return routing, and retry countdown still come from MQTT/local state
- **AND** `triageSummary` SHALL be the only value updated from the display operations summary

#### Scenario: Device Status keeps protected access or partial-success state during refresh

- **WHEN** Device Status already shows access-denied or partial-success status while background refresh runs
- **THEN** the page keeps that protected state visible
- **AND** it updates only the refreshable device-status lanes that can change safely

##### Example: safe-op feedback is not cleared by background sync

- **GIVEN** Device Status is showing a safe diagnostics feedback message after `refresh-readiness`
- **WHEN** a display-sync event reloads device status, log metadata, and display operations summary
- **THEN** the safe diagnostics feedback remains visible
- **AND** failed background status refresh does not clear the last usable device status

#### Scenario: Brand Assets keeps the dirty draft and pending action during refresh

- **WHEN** Brand Assets already has a dirty draft or pending destructive action while background refresh runs
- **THEN** the page keeps the current draft, selection, and pending action intact
- **AND** it updates only the background list data that does not invalidate the protected draft boundary

##### Example: pending delete confirmation defers remote overwrite

- **GIVEN** Brand Assets has selected profile `7` and is showing a pending delete confirmation
- **WHEN** a brand display-sync event arrives with refreshed profiles
- **THEN** the pending delete confirmation, selected profile, and draft fields remain intact
- **AND** the remote change is deferred until the operator keeps editing or discards and reloads

<!-- @trace
source: support-offline-device-brand-guarded-refresh
updated: 2026-06-14
code:
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
tests:
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->