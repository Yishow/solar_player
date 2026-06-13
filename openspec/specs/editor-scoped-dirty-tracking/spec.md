# editor-scoped-dirty-tracking Specification

## Purpose

TBD - created by archiving change 'editor-scoped-dirty-tracking'. Update Purpose after archive.

## Requirements

### Requirement: Display editor derives dirty state from scoped operations

The system SHALL derive display editor dirty state from scoped edit operations instead of requiring full-config serialization comparison on each interaction.

#### Scenario: Scoped edit operation marks dirty state correctly

- **WHEN** the operator updates a field, drags a region, or resizes a canvas object
- **THEN** the editor marks dirty state from that scoped operation
- **AND** it does not require a full-config serialization comparison for the interaction

##### Example: field edit records only its dirty path

- **GIVEN** the editor draft matches the latest baseline and the operator edits `heroCopy.titleLines`
- **WHEN** the field update is applied through `applyConfigUpdate` with dirty path `["heroCopy", "titleLines"]`
- **THEN** the draft session is dirty
- **AND** resetting that same path reconciles it against the baseline without comparing the full config

#### Scenario: Baseline-changing operations reconcile dirty state correctly

- **WHEN** the operator undoes, redoes, resets, reloads, or hits a save conflict
- **THEN** the editor reconciles dirty state against the latest baseline
- **AND** the resulting dirty indicator matches the visible draft state

##### Example: save conflict rebases dirty markers

- **GIVEN** the operator has a local dirty draft and the server returns a newer draft baseline during save
- **WHEN** the save conflict handler rebases the session to the latest baseline
- **THEN** the visible local draft remains dirty
- **AND** stale undo/redo dirty snapshots from the old baseline SHALL NOT mark the rebased draft clean

<!-- @trace
source: editor-scoped-dirty-tracking
updated: 2026-06-14
code:
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
tests:
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
-->