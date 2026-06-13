# playback-overview-solar-value-refresh-isolation Specification

## Purpose

TBD - created by archiving change 'playback-overview-solar-value-refresh-isolation'. Update Purpose after archive.

## Requirements

### Requirement: Overview and Solar keep static subtree output stable during value-only refresh

The system SHALL keep static layout, hero media, ornament, connector, and card-shell output stable on Overview and Solar when only live values, story copy, or weather data refresh.

#### Scenario: Overview updates runtime values without rebuilding static layout

- **WHEN** Overview receives new live metrics, story payload, or weather data while its config and media sources stay unchanged
- **THEN** the page updates only the value-bearing subtree
- **AND** the static layout, hero media, and KPI shell output remain equivalent to the pre-refresh render

#### Scenario: Solar updates story values without rebuilding connectors

- **WHEN** Solar receives new live values or story payload while its config and icon sources stay unchanged
- **THEN** the page updates only the value-bearing subtree
- **AND** the connector and flow-node geometry remain equivalent to the pre-refresh render

<!-- @trace
source: playback-overview-solar-value-refresh-isolation
updated: 2026-06-14
code:
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
tests:
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
-->