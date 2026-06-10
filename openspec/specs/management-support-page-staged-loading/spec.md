# management-support-page-staged-loading Specification

## Purpose

TBD — created by syncing delta spec from change `optimize-management-support-page-loading`. Update Purpose after sync.

## Requirements

### Requirement: Management support pages render primary state before deferred sources

The system SHALL keep support and diagnostics management routes responsive by rendering primary route state before deferred history aggregates, diagnostics, preview catalogs, reconnect loops, or full profile lists finish.

#### Scenario: Support page route shell appears while deferred sources are pending

- **WHEN** an operator navigates to EnergyTrend, EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, or BrandAssets and one or more deferred sources are pending
- **THEN** the route SHALL render its primary shell, known data, or explicit loading state
- **AND** it SHALL NOT require all deferred sources to finish before the route appears

#### Scenario: SlideshowPreview renders rotation before preview catalog completes

- **WHEN** SlideshowPreview has rotation state but live display preview catalog is still loading
- **THEN** the page SHALL render rotation status and controls
- **AND** preview cards SHALL show existing loading states until catalog entries resolve


<!-- @trace
source: optimize-management-support-page-loading
updated: 2026-06-11
code:
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - deploy.sh
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
-->

---
### Requirement: Management support loaders preserve partial source state

The system SHALL preserve successful source data when another independent deferred source is pending or fails. EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, and BrandAssets SHALL update each independent source without clearing unrelated usable state.

#### Scenario: EnergyHistory handles partial source completion

- **WHEN** history snapshots, daily summaries, and cumulative counters do not resolve at the same time
- **THEN** each successful source SHALL remain available to the page state
- **AND** missing sources SHALL be represented as loading or degraded state instead of zero-valued successful data

#### Scenario: DeviceStatus handles independent diagnostics

- **WHEN** device status succeeds but log export metadata or display ops summary is still pending or fails
- **THEN** the device status section SHALL remain visible
- **AND** the failed or pending diagnostic section SHALL expose its own loading, error, or access denied state

#### Scenario: BrandAssets shows initial profile before full list refresh

- **WHEN** a cached or loader-provided active brand profile exists and the full profile list is still loading
- **THEN** BrandAssets SHALL render that active profile state first
- **AND** full profile list refresh SHALL update state without overwriting dirty local edits


<!-- @trace
source: optimize-management-support-page-loading
updated: 2026-06-11
code:
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - deploy.sh
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
-->

---
### Requirement: Management support optimization preserves behavior and errors

The system SHALL preserve existing support and diagnostics behavior while optimizing loading. History charts and counters, device safe operations, log export access denied states, offline retry and reconnect, slideshow controls, preview card statuses, brand dirty blocker, upload, crop, delete, save, and display sync refresh SHALL remain observable.

#### Scenario: Deferred support source failure surfaces an error

- **WHEN** a deferred history, diagnostics, preview catalog, reconnect, or profile list request fails
- **THEN** successful unrelated state SHALL remain visible
- **AND** the failed source SHALL expose the existing error, access denied, or degraded state
- **AND** the failure SHALL NOT be reported as a successful refresh

#### Scenario: Complete payload output remains unchanged

- **WHEN** EnergyTrend, EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, or BrandAssets receives the same complete source data as before the optimization
- **THEN** the resulting view model output, chart values, counters, status labels, controls, and action feedback SHALL match the pre-optimization behavior

#### Scenario: Access and safe operation boundaries remain intact

- **WHEN** management-only diagnostics or device safe operation data is unavailable or access denied
- **THEN** the route SHALL keep the existing explicit denied or unavailable feedback
- **AND** it SHALL NOT expose restricted payloads or enable unsafe device actions

<!-- @trace
source: optimize-management-support-page-loading
updated: 2026-06-11
code:
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - deploy.sh
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/deploy.test.mjs
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
-->