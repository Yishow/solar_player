# brand-runtime-live-propagation Specification

## Purpose

TBD - created by archiving change 'propagate-brand-runtime-updates-across-playback-sessions'. Update Purpose after archive.

## Requirements

### Requirement: Propagate active brand updates to all connected playback sessions
The system SHALL propagate active brand updates to all connected playback sessions so header branding stays current without manual page reload.

#### Scenario: Active brand changes while playback is connected
- **GIVEN** one or more playback sessions are already connected
- **WHEN** the active brand profile, logo, or active-brand text is changed by a management operator
- **THEN** the runtime invalidation signal SHALL reach those sessions
- **AND** each session SHALL refresh its active brand view without a full-page reload

##### Example: Logo upload refreshes a remote playback header
- **GIVEN** a playback session is rendering the current active brand header
- **WHEN** an operator uploads a new logo for the active brand profile
- **THEN** the connected playback session refreshes the brand header data
- **AND** the header shows the new logo without resetting the current playback route


<!-- @trace
source: propagate-brand-runtime-updates-across-playback-sessions
updated: 2026-05-22
code:
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - scripts/dev.test.mjs
  - README.md
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/fastify.ts
  - apps/server/src/server.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - scripts/dev.mjs
  - packages/shared/src/managementAccess.ts
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/routes/display-pages.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/routes/sustainability-story.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/brandRuntime.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/brand.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/README.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
tests:
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->

---
### Requirement: Keep playback runtime brand hydration scoped to the active brand payload
The system SHALL let playback runtime hydrate brand state from an active-brand-only payload instead of the full management profile list.

#### Scenario: Playback header bootstraps without management list data
- **WHEN** a playback route requests its initial brand state
- **THEN** the API SHALL return the active brand payload needed by the playback shell
- **AND** the runtime SHALL NOT require the full management profile list to render the header

##### Example: Playback header reads the active brand contract
- **GIVEN** the playback header needs logo, bilingual titles, and slogans
- **WHEN** the runtime bootstraps brand state
- **THEN** it receives the active brand payload only
- **AND** it can derive the rendered brand view from that payload safely

<!-- @trace
source: propagate-brand-runtime-updates-across-playback-sessions
updated: 2026-05-22
code:
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - scripts/dev.test.mjs
  - README.md
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/fastify.ts
  - apps/server/src/server.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - scripts/dev.mjs
  - packages/shared/src/managementAccess.ts
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/routes/display-pages.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/routes/sustainability-story.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/brandRuntime.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/app.ts
  - apps/server/src/routes/brand.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/README.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
tests:
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
-->