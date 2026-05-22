# management-read-access-boundaries Specification

## Purpose

TBD - created by archiving change 'harden-management-read-surface-and-socket-boundaries'. Update Purpose after archive.

## Requirements

### Requirement: Restrict management-only read routes to trusted operator callers
The system SHALL apply the management trusted-origin or access-token boundary to management-only read routes that expose operator settings, diagnostics, display ops, readiness details, or device metadata.

#### Scenario: Untrusted caller requests management diagnostics
- **WHEN** an untrusted non-loopback caller requests a management-only read route
- **THEN** the server SHALL return an explicit denied response
- **AND** it SHALL NOT expose the full management payload

##### Example: Untrusted request to display ops is denied
- **GIVEN** the request is not from loopback, does not match a trusted management origin, and does not include a valid management access token
- **WHEN** the caller requests `GET /api/display-ops`
- **THEN** the server returns a denied response
- **AND** the response does not include the display ops summary body


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
### Requirement: Preserve playback-safe runtime reads under hardened management boundaries
The system SHALL keep a playback-safe read contract for formal display runtime callers when the caller only needs active brand, MQTT connection status, or other runtime-safe bootstrap data.

#### Scenario: Playback runtime hydrates without management credentials
- **WHEN** a playback route loads its public runtime bootstrap data without management credentials
- **THEN** the runtime SHALL receive the minimal safe payload it needs
- **AND** the call SHALL NOT require a trusted management origin only to render the public playback surface

##### Example: Header brand bootstrap stays available
- **GIVEN** a playback page is rendering on a non-management display surface
- **WHEN** the header requests the active runtime brand payload
- **THEN** the API returns the active brand fields needed by the playback shell
- **AND** it does not expose the full management profile list

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