# device-diagnostics-safe-ops-runbook Specification

## Purpose

TBD - created by archiving change 'clarify-device-diagnostics-runbook-and-safe-ops'. Update Purpose after archive.

## Requirements

### Requirement: Provide an operator-visible runbook for device diagnostics and safe operations
The system SHALL provide an operator-visible runbook for device diagnostics and safe operations so operators know which checks are safe in-app and which actions require host-level intervention.

#### Scenario: Operator opens Device Status during a degraded runtime incident
- **WHEN** the operator reviews device diagnostics during a degraded runtime incident
- **THEN** the system SHALL identify the safe in-app diagnostic actions that can be taken
- **AND** it SHALL identify the escalation path for host-level intervention when an in-app action is not supported

##### Example: Restart guidance points to the host runbook
- **GIVEN** the operator wants to recover the player process after diagnostics indicate a host-level issue
- **WHEN** the operator checks the safe-ops guidance
- **THEN** the guidance points to the host-level restart runbook
- **AND** it does not imply that the app itself performed a device reboot

<!-- @trace
source: clarify-device-diagnostics-runbook-and-safe-ops
updated: 2026-05-22
code:
  - docs/runbooks/device-diagnostics-safe-ops.md
  - apps/server/src/routes/device.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/server/src/fastify.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/hooks/useMqttStatus.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/routes/image-playlist.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/Images/index.tsx
  - scripts/dev.mjs
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - packages/shared/src/brandRuntime.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/display-readiness.ts
  - packages/shared/src/deviceDisplayOps.ts
  - docs/README.md
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - packages/shared/src/index.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/services/MetricsAccumulatorService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/hooks/useBrandAssets.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/managementAccess.ts
  - apps/server/src/routes/display-ops.ts
  - apps/server/src/routes/brand.ts
  - apps/web/src/services/api.ts
  - scripts/dev-lib.mjs
  - README.md
  - apps/server/src/server.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/routes/display-pages.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/layouts/LayoutShell.tsx
tests:
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/hooks/useMqttStatus.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/hooks/useBrandAssets.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagePlaylistRuntime.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/EnergyTrend/index.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
-->