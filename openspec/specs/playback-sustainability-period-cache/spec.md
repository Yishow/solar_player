# playback-sustainability-period-cache Specification

## Purpose

TBD - created by archiving change 'playback-sustainability-period-cache'. Update Purpose after archive.

## Requirements

### Requirement: Sustainability reuses a warm payload for the selected period

The system SHALL let Sustainability reuse a warm payload for a previously resolved period before issuing a background refresh.

#### Scenario: Switching back to a resolved period uses the warm payload first

- **WHEN** the operator switches back to a period that was already resolved earlier in the session
- **THEN** the page restores the warm payload for that selected period immediately
- **AND** it refreshes the period data in the background without a cold visible reset


<!-- @trace
source: playback-sustainability-period-cache
updated: 2026-06-14
code:
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
tests:
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
-->

---
### Requirement: Sustainability keeps selected-period content stable during refresh

The system SHALL keep selected-period highlight, stat, and household-equivalent content stable while period refresh runs.

#### Scenario: Period refresh failure preserves the selected-period visible state

- **WHEN** the page already shows a selected period and a later refresh for that period fails
- **THEN** the page keeps the existing selected-period content visible
- **AND** it surfaces the existing degraded or fallback feedback instead of clearing the visible state

<!-- @trace
source: playback-sustainability-period-cache
updated: 2026-06-14
code:
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
tests:
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
-->