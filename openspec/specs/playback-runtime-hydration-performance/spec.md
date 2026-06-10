# playback-runtime-hydration-performance Specification

## Purpose

Optimize playback page runtime hydration to avoid blocking renders and duplicate data reads. Playback routes must remain visible and responsive while live config and runtime payloads load in the background.

## Requirements

### Requirement: Playback route entry remains visible during runtime hydration

The system SHALL keep playback route entry responsive while live config and runtime payloads hydrate. A playback route SHALL render an existing visible state, cached live config, seed fallback, or the shared loading state without waiting for all story, playlist, circuit, or telemetry runtime payloads to finish.

#### Scenario: Route switches before background runtime payloads finish

- **WHEN** playback navigates from one enabled playback route to another enabled playback route
- **THEN** the destination route SHALL become the active route without waiting for story, playlist, circuit, or telemetry runtime payloads to finish
- **AND** the destination route SHALL render an existing visible state, cached live config, seed fallback, or the shared loading state

#### Scenario: Live config cache is reused for destination route

- **WHEN** a destination playback route has matching live config already primed by route loading or a previous successful load
- **THEN** the page SHALL initialize from that live config without issuing a duplicate blocking live config request before first render


<!-- @trace
source: optimize-playback-page-runtime-hydration
updated: 2026-06-11
code:
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - deploy.sh
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
tests:
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Playback runtime data loads without duplicate blocking reads

The system SHALL avoid duplicate blocking registry, live config, and runtime reads across playback route loader, playback shell metadata, route host, and page hooks. Background refreshes SHALL remain allowed when they do not block the destination route from rendering an existing visible state.

#### Scenario: Registry consumers share the same active snapshot

- **WHEN** LayoutShell, DisplayPageRouteHost, playback footer metadata, and live preview route resolution need the active display page registry snapshot during a route change
- **THEN** they SHALL reuse the same active snapshot or a shared pending request instead of each starting an independent cold request

#### Scenario: Runtime refresh starts from last-known payload

- **WHEN** a story, playlist, or circuit runtime hook has a last-known payload and starts a background refresh
- **THEN** it SHALL keep exposing the last-known payload while marking refresh state
- **AND** it SHALL replace the payload only after the newer request resolves successfully


<!-- @trace
source: optimize-playback-page-runtime-hydration
updated: 2026-06-11
code:
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - deploy.sh
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
tests:
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->

---
### Requirement: Playback optimization preserves functionality and errors

The system SHALL preserve all existing playback behavior while optimizing hydration. Playback transition phases, display sync refresh, loading state, runtime fallback banners, page-specific error messages, image autoplay, Factory Circuit circuit error state, and FHD render output SHALL remain observable after the optimization.

#### Scenario: Background runtime refresh fails

- **WHEN** a background story, playlist, or circuit runtime refresh fails after a previous payload exists
- **THEN** the page SHALL keep the previous payload visible
- **AND** it SHALL expose the existing error or fallback indicator for that page instead of reporting success

#### Scenario: Display sync still refreshes playback runtime

- **WHEN** a display:sync event targets display pages, playback settings, images, circuits, MQTT, or other existing playback runtime scopes
- **THEN** the same affected playback config or runtime payloads SHALL refresh according to the existing scope rules
- **AND** no existing playback page SHALL lose its refresh behavior because the load path was staged

#### Scenario: Existing playback tests remain valid

- **WHEN** the optimization is implemented
- **THEN** existing tests for display transition, runtime refresh, live config hydration, Images autoplay, and playback route metadata SHALL still pass
- **AND** new tests SHALL cover the staged hydration behavior

<!-- @trace
source: optimize-playback-page-runtime-hydration
created: 2026-06-10
created_by: yishow <yishow@gmail.com>
-->

<!-- @trace
source: optimize-playback-page-runtime-hydration
updated: 2026-06-11
code:
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - deploy.sh
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
tests:
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
-->