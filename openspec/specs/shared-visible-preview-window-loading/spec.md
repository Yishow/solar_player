# shared-visible-preview-window-loading Specification

## Purpose

TBD - created by archiving change 'shared-visible-preview-window-loading'. Update Purpose after archive.

## Requirements

### Requirement: Preview consumers load the requested visible window first

The system SHALL let preview consumers request a visible window of page keys so those keys resolve before deferred preview keys.

#### Scenario: Visible preview cards load before deferred cards

- **WHEN** a preview consumer requests a visible subset of page keys
- **THEN** the shared preview loader resolves loading or warm states for that subset first
- **AND** it continues loading deferred keys in the background without blocking the visible cards


<!-- @trace
source: shared-visible-preview-window-loading
updated: 2026-06-14
code:
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
tests:
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
-->

---
### Requirement: Deferred preview failures stay isolated

The system SHALL keep deferred or failed preview keys isolated from unrelated visible keys.

#### Scenario: One preview key fails while the visible window stays usable

- **WHEN** one requested or deferred preview key fails after other visible keys already have usable state
- **THEN** the failed key exposes its own degraded or error state
- **AND** the other visible keys keep their existing loading, warm, or resolved output


<!-- @trace
source: shared-visible-preview-window-loading
updated: 2026-06-14
code:
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
tests:
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
-->

---
### Requirement: Visible preview loading preserves page-instance identity

The system SHALL preserve page-instance identity while loading only the requested visible preview window.

#### Scenario: Duplicate template instances stay distinct in the visible window

- **WHEN** the requested visible window contains two page instances that share a template but use different page keys
- **THEN** the preview loader keeps separate preview state for each page instance
- **AND** loading the visible window does not collapse the two instances into one shared preview result

<!-- @trace
source: shared-visible-preview-window-loading
updated: 2026-06-14
code:
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
tests:
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
-->