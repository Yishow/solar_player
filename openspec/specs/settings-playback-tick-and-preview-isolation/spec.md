# settings-playback-tick-and-preview-isolation Specification

## Purpose

TBD - created by archiving change 'settings-playback-tick-and-preview-isolation'. Update Purpose after archive.

## Requirements

### Requirement: Playback Settings keeps the editable form stable during tick and preview updates

The system SHALL keep the editable Playback Settings form and page rows stable while countdown, runtime progress, or preview rail data updates.

#### Scenario: Countdown update does not rebuild the editable form

- **WHEN** the countdown or runtime progress updates while the editable form is already visible
- **THEN** the page updates only the runtime subtree
- **AND** it keeps the editable form and page-row output equivalent to the pre-tick render

#### Scenario: Preview rail update does not rebuild the page-row editor

- **WHEN** preview rail state updates while the editable page rows are already visible
- **THEN** the page updates only the preview subtree
- **AND** it keeps the editable page-row editor equivalent to the pre-refresh render


<!-- @trace
source: settings-playback-tick-and-preview-isolation
updated: 2026-06-14
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
tests:
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->

---
### Requirement: Playback Settings preserves existing save and sync behavior while isolated lanes update

The system SHALL preserve save, reorder, and display-sync behavior while runtime and preview lanes are isolated from the editable form.

#### Scenario: Save or reorder completes without breaking isolated lanes

- **WHEN** the operator saves settings or reorders playback pages while countdown or preview updates are still occurring
- **THEN** the page completes the save or reorder flow with the existing success and error semantics
- **AND** it keeps the editable form and isolated runtime or preview lanes consistent after the update

<!-- @trace
source: settings-playback-tick-and-preview-isolation
updated: 2026-06-14
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
tests:
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
-->