# editor-active-surface-recompute-and-warm-panels Specification

## Purpose

TBD - created by archiving change 'editor-active-surface-recompute-and-warm-panels'. Update Purpose after archive.

## Requirements

### Requirement: Display editor recomputes only active surfaces

The system SHALL limit editor recompute to the active workspace, page, selection, and changed regions.

#### Scenario: Inactive workspace does not resolve the full editor graph

- **WHEN** the operator is viewing a non-editor workspace without returning to the editor workspace
- **THEN** the editor does not resolve the full editor-region graph for the inactive surface
- **AND** it keeps only the data needed for the active visible surface

##### Example: asset workspace skips editor region graph

- **GIVEN** the URL is `/display-pages/editor?page=overview&workspace=assets`
- **WHEN** the asset workspace is active without an editor return context
- **THEN** the active-surface region graph flag SHALL be false
- **AND** the editor does not call the full `resolveDisplayEditorRegions` path for that inactive editor surface

#### Scenario: Preview and inspector recompute only for the active selection

- **WHEN** the operator changes one active selection while staying on the same page and workspace
- **THEN** the editor recomputes only the preview and inspector data needed for that active selection
- **AND** it does not rebuild unrelated editor regions unnecessarily

##### Example: preview is gated by editor workspace

- **GIVEN** preview rendering is enabled and the active workspace is `editor`
- **WHEN** the selected region changes from one Overview region to another
- **THEN** preview and inspector inputs are derived from the active `selectedRegion`
- **AND** preview content SHALL NOT render while the active workspace is `assets` or `shell`


<!-- @trace
source: editor-active-surface-recompute-and-warm-panels
updated: 2026-06-14
code:
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
-->

---
### Requirement: Display editor support panels reuse warm state and isolate failures

The system SHALL let asset, publishing, and health panels reuse warm state and isolate panel refresh failures from the editable draft.

#### Scenario: Warm panel state survives a tab switch

- **WHEN** the operator returns to a panel that already loaded usable support data earlier in the session
- **THEN** the editor restores the warm panel state immediately
- **AND** it refreshes the panel in the background without clearing draft or selection state

##### Example: publish panel reuses page-scoped state

- **GIVEN** the publish panel already loaded validation and fallback state for `overview`
- **WHEN** the operator switches away and then returns to the publish tab
- **THEN** the publish panel reads the warm `publishingStateByPage["overview"]`
- **AND** the background refresh updates only the publish panel lane

#### Scenario: Panel refresh failure keeps the draft usable

- **WHEN** a panel refresh fails after the panel already had usable warm state
- **THEN** the panel exposes only its own degraded or error state
- **AND** the draft, selection, and other panels remain usable

##### Example: health refresh error does not clear report

- **GIVEN** the asset health panel has a usable report from an earlier load
- **WHEN** a later asset health refresh fails
- **THEN** the hook sets the health panel error message
- **AND** it SHALL NOT clear the warm health report, editable draft, or current selection

<!-- @trace
source: editor-active-surface-recompute-and-warm-panels
updated: 2026-06-14
code:
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
tests:
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
-->