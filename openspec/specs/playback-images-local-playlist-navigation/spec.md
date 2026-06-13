# playback-images-local-playlist-navigation Specification

## Purpose

TBD - created by archiving change 'playback-images-local-playlist-navigation'. Update Purpose after archive.

## Requirements

### Requirement: Images advances the active item locally from a reusable playlist payload

The system SHALL let Images advance the visible active item locally from a reusable playlist payload instead of coupling each active item change to a remote playlist read.

#### Scenario: Autoplay advances the active item without a remote read

- **WHEN** autoplay advances the active item while a reusable playlist payload is already loaded
- **THEN** the page derives the next visible item locally
- **AND** it does not require a remote playlist read for that active item change alone

#### Scenario: Manual navigation advances the active item without a remote read

- **WHEN** the operator triggers manual next or previous navigation while the reusable playlist payload is already loaded
- **THEN** the page updates the active item locally
- **AND** it keeps the visible stage, caption, and thumbnail state in sync without a new remote read

#### Scenario: Shuffle autoplay advances the active item without a per-item remote read

- **WHEN** autoplay runs with shuffle enabled while the reusable playlist payload is already loaded
- **THEN** the page derives the next visible shuffled item locally
- **AND** it does not require a remote playlist read for that shuffled active item change alone


<!-- @trace
source: playback-images-local-playlist-navigation
updated: 2026-06-14
code:
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
tests:
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Images reconciles the active item after playlist refresh without visible regression

The system SHALL reconcile the active item after playlist refresh while preserving the visible stage and fallback behavior.

#### Scenario: Playlist refresh updates the payload while keeping the visible stage usable

- **WHEN** a playlist refresh returns new playlist data after the page already showed an active item
- **THEN** the page reconciles the active item against the refreshed payload
- **AND** it keeps the visible stage, caption, thumbnail, and fallback behavior usable during the transition

<!-- @trace
source: playback-images-local-playlist-navigation
updated: 2026-06-14
code:
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
tests:
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->