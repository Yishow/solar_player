# monitoring-history-runtime-refresh Specification

## Purpose

TBD - created by archiving change 'add-runtime-refresh-for-sustainability-and-monitoring-history'. Update Purpose after archive.

## Requirements

### Requirement: Refresh monitoring history pages when persisted history data changes
The system SHALL refresh monitoring history pages when persisted history data changes so `Energy Trend` and `Energy History` remain aligned with newly written snapshots and summaries.

#### Scenario: History pages stay open while new snapshots are persisted
- **GIVEN** `Energy Trend` or `Energy History` is already open on a selected range
- **WHEN** the server persists new metric snapshots or daily summaries and emits a monitoring-history refresh signal
- **THEN** the page SHALL refetch the history data for the current range
- **AND** it SHALL preserve the current range selection while updating the page

##### Example: Week view reloads after a new snapshot write
- **GIVEN** `Energy History` is showing the `week` range
- **WHEN** a new metric snapshot is written and the monitoring-history signal is emitted
- **THEN** the page reloads the `week` history datasets
- **AND** the page keeps the `week` tab active after the refresh

<!-- @trace
source: add-runtime-refresh-for-sustainability-and-monitoring-history
updated: 2026-05-22
code:
  - apps/server/src/server.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useMqttStatus.ts
  - packages/shared/src/managementAccess.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - packages/shared/src/brandRuntime.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/server/src/app.ts
  - apps/server/src/routes/brand.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - docs/README.md
  - apps/server/src/services/imagePlaylistService.ts
  - README.md
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/index.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/routes/display-ops.ts
  - scripts/dev-lib.mjs
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/fastify.ts
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
tests:
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/services/socket.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
-->