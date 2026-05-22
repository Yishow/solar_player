# image-playlist-governance-bootstrap-control Specification

## Purpose

TBD - created by archiving change 'remove-image-playlist-read-bootstrap-side-effects'. Update Purpose after archive.

## Requirements

### Requirement: Bootstrap governance rows only through an explicit management action
The system SHALL create or backfill persisted image playlist governance rows only through an explicit management bootstrap action.

#### Scenario: Operator chooses to bootstrap playlist governance
- **WHEN** a management operator explicitly triggers playlist governance bootstrap
- **THEN** the server SHALL create any missing governance rows needed for authoring
- **AND** it SHALL emit the existing playlist invalidation events after that mutation

##### Example: Explicit bootstrap creates missing rows
- **GIVEN** image assets exist and some governance rows are missing
- **WHEN** the operator posts to the governance bootstrap action
- **THEN** the server creates the missing rows
- **AND** subsequent governance reads expose those persisted rows for editing

<!-- @trace
source: remove-image-playlist-read-bootstrap-side-effects
updated: 2026-05-22
code:
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/routes/brand.ts
  - apps/server/src/server.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/services/api.ts
  - docs/README.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - scripts/dev.mjs
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/device.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - scripts/dev.test.mjs
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/brandRuntime.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - scripts/dev-lib.mjs
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/server/src/routes/display-readiness.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/managementAccess.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - README.md
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/display-pages.test.ts
-->