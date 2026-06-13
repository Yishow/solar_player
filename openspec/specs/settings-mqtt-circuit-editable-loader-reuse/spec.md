# settings-mqtt-circuit-editable-loader-reuse Specification

## Purpose

TBD - created by archiving change 'settings-mqtt-circuit-editable-loader-reuse'. Update Purpose after archive.

## Requirements

### Requirement: MQTT and Circuit Settings restore persisted controls through reusable editable loaders

The system SHALL restore persisted MQTT and circuit controls through reusable editable loaders for bootstrap, resync, and mutation follow-up paths.

#### Scenario: MQTT Settings restores persisted controls before diagnostics

- **WHEN** MQTT Settings boots or manually resyncs
- **THEN** the page restores persisted broker, topic, and weather controls through the reusable editable loader
- **AND** it keeps weather, readiness, and stream diagnostics in a deferred lane

##### Example: remote sync reload keeps diagnostics deferred

- **GIVEN** MQTT Settings has no local draft edits
- **WHEN** a relevant display sync event asks the page to reload
- **THEN** broker settings, topic mappings, and weather settings reload through the editable loader
- **AND** readiness refresh is scheduled as deferred diagnostics instead of blocking the editable reload

#### Scenario: Circuit Settings restores persisted controls before diagnostics

- **WHEN** Circuit Settings boots or manually resyncs
- **THEN** the page restores the persisted circuit rows through the reusable editable loader
- **AND** it keeps readiness or related diagnostics in a deferred lane

##### Example: circuit resync keeps rows first

- **GIVEN** Circuit Settings has persisted circuit rows
- **WHEN** the operator manually refreshes the circuit table
- **THEN** the circuit rows reload through the editable loader
- **AND** readiness refresh remains outside the persisted-control lane


<!-- @trace
source: settings-mqtt-circuit-editable-loader-reuse
updated: 2026-06-14
code:
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Solar/index.tsx
tests:
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
-->

---
### Requirement: MQTT and Circuit diagnostics preserve existing safety behavior

The system SHALL preserve dirty guard, masked password, access, and mutation error behavior while deferred diagnostics refresh.

#### Scenario: Diagnostics refresh fails without clearing persisted controls

- **WHEN** MQTT or circuit diagnostics refresh fails after persisted controls are already visible
- **THEN** the page keeps the persisted controls editable
- **AND** it surfaces the existing deferred-lane error semantics without clearing dirty or protected state

##### Example: mutation follow-up does not block controls on diagnostics

- **GIVEN** MQTT Settings saved masked broker settings or Circuit Settings saved row edits
- **WHEN** the follow-up readiness diagnostics refresh fails
- **THEN** the saved controls stay visible and editable
- **AND** dirty guard, masked password, and access-denied behavior remain unchanged

<!-- @trace
source: settings-mqtt-circuit-editable-loader-reuse
updated: 2026-06-14
code:
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Solar/index.tsx
tests:
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
-->