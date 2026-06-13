# playback-factory-circuit-runtime-boundary Specification

## Purpose

TBD - created by archiving change 'playback-factory-circuit-runtime-boundary'. Update Purpose after archive.

## Requirements

### Requirement: Factory Circuit preserves last-known usable runtime state during refresh

The system SHALL preserve the last-known usable Factory Circuit runtime state while circuits or story data refresh in the background.

#### Scenario: Circuit refresh fails after usable runtime was already visible

- **WHEN** the page already has usable circuits-derived runtime state and a later refresh fails
- **THEN** the page keeps the last-known usable runtime state visible
- **AND** it surfaces the existing degraded or fallback feedback instead of clearing the page


<!-- @trace
source: playback-factory-circuit-runtime-boundary
updated: 2026-06-14
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
tests:
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
-->

---
### Requirement: Factory Circuit separates circuits refresh from story refresh

The system SHALL keep circuits-source refresh and story-source refresh on separate runtime boundaries so one source does not trigger unnecessary full-page runtime rebuilds.

#### Scenario: Story refresh updates values without rebuilding the circuits source

- **WHEN** the story payload refreshes while the circuits source stays unchanged
- **THEN** the page updates only the story-dependent runtime values
- **AND** it keeps the existing circuits-derived runtime state intact until a circuits refresh actually succeeds

<!-- @trace
source: playback-factory-circuit-runtime-boundary
updated: 2026-06-14
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
tests:
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
-->