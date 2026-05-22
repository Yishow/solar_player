# display-page-registry-runtime-invalidation Specification

## Purpose

TBD - created by archiving change 'invalidate-display-page-registry-clients-on-registry-mutations'. Update Purpose after archive.

## Requirements

### Requirement: Invalidate display page registry clients after registry mutations

The system SHALL invalidate registry-consuming clients after a display page registry mutation so they can reload the latest registry snapshot.

#### Scenario: Registry page is archived

- **WHEN** a display page instance is archived in the registry
- **THEN** registry-consuming clients SHALL reload the registry snapshot
- **AND** they SHALL stop treating the archived page as if it were still an active route definition

##### Example: Route host drops an archived route

- **GIVEN** a registry-backed playback route existed before the archive action
- **WHEN** the archive mutation completes and the client receives the relevant mutation signal
- **THEN** the route host reloads the registry snapshot
- **AND** navigating to the archived route resolves through the existing fallback path instead of the stale page definition

#### Scenario: Playback shell metadata consumers reload after route metadata changes

- **WHEN** a display page registry mutation changes an active playback route's slug, enabled state, display order, or display name
- **THEN** playback shell metadata consumers SHALL reload the latest registry snapshot
- **AND** playback footer entries, active route state, and route metadata resolution SHALL converge on the updated snapshot without a full browser reload

##### Example: Footer order follows the updated registry snapshot

- **GIVEN** a playback footer is rendering entries from the latest active registry snapshot
- **WHEN** an operator changes a registry-backed page's display order or route slug and the mutation completes
- **THEN** the footer reloads the registry snapshot
- **AND** the active playback route metadata reflects the updated order or slug without a manual browser refresh


<!-- @trace
source: resolve-dynamic-playback-route-shell-metadata
updated: 2026-05-22
code:
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - scripts/dev.mjs
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.test.mjs
  - apps/server/src/server-startup.ts
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Rebuild editor and route definitions from the latest registry snapshot

The system SHALL rebuild registry-derived editor and route definitions from the latest registry snapshot after create or update mutations.

#### Scenario: New page appears in the editor after creation

- **WHEN** a new display page instance is created in the registry
- **THEN** the editor route SHALL rebuild its page definitions from the updated registry snapshot
- **AND** the new page becomes available without requiring a full browser reload

##### Example: Editor navigation exposes a newly created page

- **GIVEN** the editor is open while the registry-backed page list does not yet include `sustainability`
- **WHEN** a create mutation for `sustainability` completes and the client receives the relevant mutation signal
- **THEN** the editor rebuilds its page definitions from the refreshed registry snapshot
- **AND** the page picker exposes `sustainability` without a manual browser reload

<!-- @trace
source: invalidate-display-page-registry-clients-on-registry-mutations
updated: 2026-05-20
code:
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - packages/shared/src/displayOps.ts
  - CLAUDE.md
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/viewModel.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/hooks/displaySyncDraftGuard.ts
  - apps/web/src/pages/OfflineError/index.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/SlideshowPreview/viewModel.ts
  - apps/web/src/pages/OfflineError/viewModel.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - package.json
  - AGENTS.md
  - apps/web/src/pages/managementDisplaySyncScopes.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/energyMonitoringState.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/logger.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/metrics-history.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/hooks/useDisplayPageRegistry.ts
  - scripts/dev.mjs
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/BrandAssets/index.tsx
  - apps/web/src/pages/SlideshowPreview/index.tsx
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/logger.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.test.ts
  - apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/ImageManagement/viewModel.test.ts
  - apps/web/src/pages/OfflineError/viewModel.test.ts
-->