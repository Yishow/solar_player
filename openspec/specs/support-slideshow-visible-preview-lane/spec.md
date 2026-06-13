# support-slideshow-visible-preview-lane Specification

## Purpose

TBD - created by archiving change 'support-slideshow-visible-preview-lane'. Update Purpose after archive.

## Requirements

### Requirement: Slideshow Preview loads visible cards before deferred preview cards

The system SHALL let Slideshow Preview load preview state for the visible card window before deferred cards.

#### Scenario: Visible cards stay usable while deferred cards continue loading

- **WHEN** Slideshow Preview enters with more queued cards than the visible card window
- **THEN** the page resolves loading, warm, or visible preview state for the visible cards first
- **AND** deferred cards continue loading without blocking the visible queue window

##### Example: six-card queue with five-card visible window

- **GIVEN** Slideshow Preview has six enabled cards and the visible window contains five cards
- **WHEN** the preview catalog is requested
- **THEN** only the five visible page keys are requested for the first preview lane
- **AND** playback summary and queue controls render before the sixth card preview resolves


<!-- @trace
source: support-slideshow-visible-preview-lane
updated: 2026-06-14
code:
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
-->

---
### Requirement: Slideshow Preview keeps controls and queue behavior stable during deferred preview loading

The system SHALL keep playback summary, current-page status, and manual navigation usable while deferred preview cards continue loading or fail.

#### Scenario: Deferred preview failure does not disable queue controls

- **WHEN** one deferred preview card fails after the visible queue is already usable
- **THEN** the page keeps manual next, manual previous, summary, and current-page status usable
- **AND** it surfaces degraded state only for the failed card

##### Example: one failed card beside a ready card

- **GIVEN** one visible card has ready preview content and another card reports config-unavailable
- **WHEN** Slideshow Preview renders the queue
- **THEN** the ready card remains visible with its resolved preview content
- **AND** only the failed card renders the live preview fallback state

<!-- @trace
source: support-slideshow-visible-preview-lane
updated: 2026-06-14
code:
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
-->