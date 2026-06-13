# shared-registry-config-warm-cache Specification

## Purpose

TBD - created by archiving change 'shared-registry-config-warm-cache'. Update Purpose after archive.

## Requirements

### Requirement: Registry and live config consumers reuse shared warm cache

The system SHALL let route loaders and mounted consumers reuse the same warm registry snapshot or live config envelope before issuing a new blocking read.

#### Scenario: Warm registry snapshot seeds a mounted consumer

- **WHEN** a route loader or another mounted consumer already resolved the active display page registry snapshot
- **THEN** the next consumer initializes from that shared warm snapshot
- **AND** it does not start a duplicate blocking registry read before first render

#### Scenario: Warm live config envelope seeds the route host

- **WHEN** the live config envelope for a page is already cached
- **THEN** the route host initializes from the cached envelope for the first visible render
- **AND** it refreshes only through the explicit force-refresh or display-sync path when needed


<!-- @trace
source: shared-registry-config-warm-cache
updated: 2026-06-14
code:
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/Solar/index.tsx
tests:
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
-->

---
### Requirement: Shared cache reuse preserves fallback and refresh semantics

The system SHALL preserve existing fallback, error, and force-refresh behavior when shared warm cache reuse is enabled.

#### Scenario: Refresh failure keeps the existing visible state

- **WHEN** a force refresh or display-sync refresh fails after a warm registry snapshot or live config envelope was already visible
- **THEN** the system keeps the existing visible or fallback state in place
- **AND** it surfaces the existing error semantics instead of reporting success

#### Scenario: Live-stage warm cache does not alter draft-stage behavior

- **WHEN** draft-stage consumers use the same config hook paths after live-stage warm cache reuse was introduced
- **THEN** draft-stage baseline, dirty state, save, and conflict behavior stay equivalent to the pre-change behavior
- **AND** live-stage warm cache does not leak into draft-stage editing semantics

<!-- @trace
source: shared-registry-config-warm-cache
updated: 2026-06-14
code:
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/Solar/index.tsx
tests:
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
-->