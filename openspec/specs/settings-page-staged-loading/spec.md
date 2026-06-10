# settings-page-staged-loading Specification

## Purpose

Defines staged loading contracts for settings pages (Playback Settings, Image Management, MQTT Settings, Circuit Settings) so that first-screen editable form/list state renders independently from deferred diagnostics, previews, polling, and readiness refreshes. Ensures settings pages avoid blocking the operator on slow diagnostic data while preserving all existing save/test/CRUD behavior, dirty guards, MQTT password masking, and access-denied semantics.

## Requirements

### Requirement: Settings pages render editable state before deferred diagnostics

The system SHALL separate first-screen editable state from deferred diagnostics, previews, polling, and readiness data on Playback Settings, Image Management, MQTT Settings, and Circuit Settings. Each settings page SHALL render its primary editable form or list as soon as the required editable data resolves.

#### Scenario: Playback Settings renders before previews complete

- **WHEN** Playback Settings has loaded playback settings and playback pages but display ops, live preview catalog, rotation diagnostics, or runtime countdown are still loading
- **THEN** the page SHALL render the editable playback settings form and page rows
- **AND** the deferred diagnostics or previews SHALL show their existing loading or degraded states

#### Scenario: Image Management renders before diagnostics complete

- **WHEN** Image Management has loaded image assets and playlist governance data but asset health or selected asset references are still loading
- **THEN** the page SHALL render the image library and playlist controls
- **AND** asset health or selected references SHALL update independently after their requests resolve

#### Scenario: MQTT and Circuit Settings render persisted controls first

- **WHEN** MQTT Settings has loaded persisted broker, topic, and weather settings but weather options, weather preview, readiness, live metrics, or topic polling are still pending
- **THEN** the page SHALL render the persisted controls
- **AND** deferred sections SHALL update independently


<!-- @trace
source: optimize-settings-page-staged-loading
updated: 2026-06-11
code:
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - deploy.sh
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
-->

---
### Requirement: Settings page loaders avoid duplicate blocking reads

The system SHALL centralize repeated bootstrap and resync logic for settings pages so the same page does not perform duplicate blocking reads for the same source during route entry.

#### Scenario: Playback Settings does not double-load playback sources

- **WHEN** Playback Settings initializes its editable model and runtime diagnostics
- **THEN** getPlaybackSettings and getDisplayRotationPreview SHALL NOT be required by two independent cold blocking paths before the editable form appears

#### Scenario: Image Management uses one library and playlist model loader

- **WHEN** Image Management bootstraps, saves, or resyncs image library and playlist governance state
- **THEN** the page SHALL use one shared model application path for images, storage usage, playlist entries, resolved playlist entries, shuffle, bulk duration, and selected item state

#### Scenario: Live preview catalog uses one load implementation

- **WHEN** a management page requests live display preview states
- **THEN** bootstrap loading and display sync reload SHALL use the same catalog load implementation
- **AND** the catalog SHALL avoid duplicated registry/config logic inside separate bootstrap and reload branches


<!-- @trace
source: optimize-settings-page-staged-loading
updated: 2026-06-11
code:
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - deploy.sh
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
-->

---
### Requirement: Settings optimization preserves functionality and errors

The system SHALL preserve all existing settings behavior while optimizing loading. Saving settings, testing MQTT connection, saving topic mappings, image upload/save/delete/cover operations, playlist governance, circuit add/save/delete, dirty guards, display sync draft protection, access denied states, and MQTT password masking SHALL remain observable.

#### Scenario: Deferred diagnostic failure keeps editable state and surfaces an error

- **WHEN** a deferred display ops, preview, readiness, asset health, asset reference, weather options, or weather preview request fails
- **THEN** the editable page state SHALL remain usable
- **AND** the page SHALL expose the existing error, degraded, or loading feedback for that deferred section
- **AND** the failure SHALL NOT be reported as a successful refresh

#### Scenario: Save, test, and CRUD behavior remains unchanged

- **WHEN** an operator edits and saves playback settings, tests MQTT connection, saves topic mappings, uploads or deletes images, saves playlist governance, adds or deletes circuits, or resolves a display sync draft prompt
- **THEN** the resulting API calls, dirty state transitions, success feedback, and error feedback SHALL match the pre-optimization behavior

#### Scenario: Sensitive and restricted data remains protected

- **WHEN** MQTT settings or management-only diagnostics are loaded after the optimization
- **THEN** MQTT password values returned to the client SHALL remain masked as ****
- **AND** management access denied responses SHALL remain explicit without exposing restricted payloads


<!-- @trace
source: optimize-settings-page-staged-loading
updated: 2026-06-10
code:
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
-->

<!-- @trace
source: optimize-settings-page-staged-loading
updated: 2026-06-11
code:
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useLiveMetrics.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/BrandAssets/loadModel.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - deploy.sh
  - apps/web/src/pages/SlideshowPreview/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - deploy/reset-db-settings.sh
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - deploy/export-runtime-state.sh
  - apps/web/src/pages/ImageManagement/loadModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - scripts/deploy.test.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
tests:
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.tsx
  - apps/web/src/pages/ImageManagement/loadModel.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/PlaybackSettings/loadModel.test.ts
  - apps/web/src/pages/DeviceStatus/index.test.tsx
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/BrandAssets/loadModel.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/OfflineError/index.test.ts
  - apps/web/src/hooks/useDisplayPageRegistry.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
-->