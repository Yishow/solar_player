# management-socket-session-boundaries Specification

## Purpose

TBD - created by archiving change 'harden-management-read-surface-and-socket-boundaries'. Update Purpose after archive.

## Requirements

### Requirement: Classify socket sessions as playback-safe or management-trusted
The system SHALL classify each Socket.IO session at handshake time so the server can distinguish playback-safe listeners from trusted management listeners.

#### Scenario: Playback session connects without management credentials
- **WHEN** a socket client connects without a trusted management origin or valid management access token
- **THEN** the server SHALL classify that session as playback-safe
- **AND** it SHALL only receive the socket feeds allowed for playback-safe sessions

##### Example: Public playback display gets runtime-safe bootstrap only
- **GIVEN** a display runtime session connects from an untrusted non-management client
- **WHEN** the socket handshake completes
- **THEN** the server classifies the session as playback-safe
- **AND** the connection is not subscribed to management-only diagnostic events


<!-- @trace
source: harden-management-read-surface-and-socket-boundaries
updated: 2026-05-22
code:
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/server.ts
  - packages/shared/src/managementAccess.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - README.md
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - packages/shared/src/brandRuntime.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/services/displayOpsService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/server-startup.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/app/router.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/README.md
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/fastify.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/app.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/brand.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/routes/device.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/services/socket.test.ts
-->

---
### Requirement: Keep management-only socket events scoped to trusted sessions
The system SHALL emit management-only socket events only to trusted management sessions, while continuing to expose playback-safe events to both playback and management sessions.

#### Scenario: Sensitive diagnostic event is withheld from playback-safe sessions
- **WHEN** the server emits a management-only diagnostic event
- **THEN** only trusted management sessions SHALL receive it
- **AND** playback-safe sessions SHALL remain connected without receiving that event

##### Example: System error stays management-only
- **GIVEN** one trusted management session and one playback-safe session are connected
- **WHEN** the server emits a `system:error` notification
- **THEN** the trusted management session receives the notification
- **AND** the playback-safe session does not receive it

<!-- @trace
source: harden-management-read-surface-and-socket-boundaries
updated: 2026-05-22
code:
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/server.ts
  - packages/shared/src/managementAccess.ts
  - scripts/dev.mjs
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - README.md
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - packages/shared/src/brandRuntime.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/services/displayOpsService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/server-startup.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/app/router.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - docs/README.md
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - scripts/dev-lib.mjs
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/fastify.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/server/src/app.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/services/api.ts
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/server/src/routes/brand.ts
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/routes/device.ts
tests:
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/services/socket.test.ts
-->