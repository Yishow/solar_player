# management-draft-save-concurrency Specification

## Purpose

TBD - created by archiving change 'add-optimistic-concurrency-to-management-draft-saves'. Update Purpose after archive.

## Requirements

### Requirement: Reject stale management draft saves with an explicit optimistic-concurrency conflict
The system SHALL reject stale management draft saves with an explicit optimistic-concurrency conflict instead of silently overwriting newer server state.

#### Scenario: A second session saves an older draft baseline
- **GIVEN** one session has already saved a newer draft version for a management draft resource
- **AND** another session is still editing an older baseline
- **WHEN** the older session tries to save using that stale baseline
- **THEN** the server SHALL return a conflict response
- **AND** it SHALL NOT overwrite the newer draft version on the server

##### Example: Stale display page draft save returns conflict
- **GIVEN** `overview` draft version `5` has already been saved by another operator
- **AND** the current editor is still based on draft version `4`
- **WHEN** the older editor saves its draft changes
- **THEN** the server returns a 409 conflict response
- **AND** the response includes the current server draft baseline for `overview`


<!-- @trace
source: add-optimistic-concurrency-to-management-draft-saves
updated: 2026-05-22
code:
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/fastify.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/routes/brand.ts
  - packages/shared/src/brandRuntime.ts
  - scripts/dev-lib.mjs
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/managementAccess.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - docs/README.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server-startup.ts
  - scripts/dev.test.mjs
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - README.md
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/services/DailySummaryService.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/householdEquivalenceService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->

---
### Requirement: Preserve local draft edits when a save conflict occurs
The system SHALL preserve local draft edits when an optimistic-concurrency conflict occurs so the operator can review or reapply them.

#### Scenario: Editor receives a draft-save conflict
- **WHEN** the display page editor receives a conflict from the server
- **THEN** the editor SHALL keep the local unsaved edits available in the client session
- **AND** it SHALL present guidance to reload or reconcile against the newer server draft

##### Example: Conflict does not clear the local session
- **GIVEN** an operator has unsaved layout edits in the editor
- **WHEN** the save request returns a stale-baseline conflict
- **THEN** the editor keeps those local edits in memory
- **AND** the operator can choose to reload the newest server draft before saving again

<!-- @trace
source: add-optimistic-concurrency-to-management-draft-saves
updated: 2026-05-22
code:
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/routes/display-ops.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/fastify.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/routes/brand.ts
  - packages/shared/src/brandRuntime.ts
  - scripts/dev-lib.mjs
  - apps/server/src/routes/device-display-ops.ts
  - packages/shared/src/deviceDisplayOps.ts
  - packages/shared/src/managementAccess.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - docs/README.md
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/server-startup.ts
  - scripts/dev.test.mjs
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - README.md
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/services/DailySummaryService.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/householdEquivalenceService.ts
tests:
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
-->