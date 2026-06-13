# support-history-range-cache-sharing Specification

## Purpose

TBD - created by archiving change 'support-history-range-cache-sharing'. Update Purpose after archive.

## Requirements

### Requirement: Energy Trend and Energy History reuse warm history payloads by range

The system SHALL let Energy Trend and Energy History reuse warm history payloads by the selected range before issuing background refreshes.

#### Scenario: Energy History opens a range already resolved by Energy Trend

- **WHEN** Energy Trend already resolved a history payload for a given range in the current session
- **THEN** Energy History initializes from that warm payload when it opens the same range
- **AND** it refreshes the range in the background instead of performing a cold visible reset

##### Example: History opens the day range after Trend

- **GIVEN** Energy Trend has stored a `day` history payload in the shared range cache
- **WHEN** Energy History opens with the `day` range selected
- **THEN** Energy History uses the cached `day` snapshots for its first visible chart state
- **AND** it still starts the `day` history refresh in the background

#### Scenario: Energy Trend switches back to a warm range

- **WHEN** Energy Trend switches back to a range that was already resolved earlier in the session
- **THEN** the page restores the warm payload immediately
- **AND** it refreshes that range in the background without losing the current visible chart state

##### Example: Trend returns from week to day

- **GIVEN** Energy Trend has cached `day` and `week` history payloads
- **WHEN** the operator switches from `week` back to `day`
- **THEN** the chart resolves the cached `day` payload instead of keeping the stale `week` payload
- **AND** the `day` refresh runs without a cold empty chart flash


<!-- @trace
source: support-history-range-cache-sharing
updated: 2026-06-14
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
tests:
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->

---
### Requirement: Energy History keeps partial-source semantics while using shared cache

The system SHALL preserve Energy History source-level loading and degraded semantics while reusing shared warm cache.

#### Scenario: One history source stays degraded while the warm payload remains visible

- **WHEN** one Energy History source fails during refresh after the page already showed a warm payload
- **THEN** the page keeps the warm payload visible
- **AND** it exposes degraded state only for the failing source instead of collapsing the whole page to a cold state

##### Example: summaries fail while snapshots remain warm

- **GIVEN** Energy History has a warm `month` snapshot payload
- **WHEN** the `daily-summary` source fails during a `month` refresh
- **THEN** the page keeps the warm snapshot chart visible
- **AND** only the summary lane contributes degraded state to the operator-facing status

<!-- @trace
source: support-history-range-cache-sharing
updated: 2026-06-14
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/CircuitSettings/loadModel.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DeviceStatus/loadModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/shared/displayPageRouteWarmup.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/editableSettingsLoader.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
tests:
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/BrandAssets/index.test.ts
  - apps/web/src/pages/shared/editableSettingsLoader.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageIconRendering.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayRuntimeHookOrder.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/index.test.tsx
-->