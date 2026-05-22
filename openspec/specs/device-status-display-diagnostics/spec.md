# device-status-display-diagnostics Specification

## Purpose

TBD - created by archiving change 'add-device-status-display-ops-observability'. Update Purpose after archive.

## Requirements

### Requirement: Keep Device Status diagnostics bounded to safe read and refresh actions
The system SHALL keep `Device Status` diagnostics bounded to safe read and refresh actions for display operations, each action SHALL return a truthful server-side result for the requested safe operation, and the diagnostics surface SHALL also tell operators when a host-level runbook is required instead of an in-app device control.

#### Scenario: Operator triggers safe display diagnostics action
- **WHEN** a trusted management caller triggers a display diagnostics action from `Device Status`
- **THEN** the action performs a safe read, refresh, or summary export operation
- **AND** the response reflects the actual server-side diagnostic result and timestamp instead of placeholder-only success text
- **AND** it does not perform dangerous device control by default

##### Example: Refresh readiness reports a real safe result
- **GIVEN** the operator chooses `refresh-readiness` from `Device Status`
- **AND** the caller is trusted for management diagnostics
- **WHEN** the server completes the safe diagnostic action
- **THEN** the response names `refresh-readiness` as the action that ran
- **AND** the returned summary matches the refreshed safe diagnostic output

#### Scenario: Unsupported device controls provide explicit host-level guidance
- **WHEN** an operator requests a device control that is not supported inside the app runtime
- **THEN** the response SHALL state that the operation was not executed in-app
- **AND** it SHALL point the operator to the host-level runbook or restart guidance instead

##### Example: Reboot route stays informational only
- **GIVEN** reboot remains disabled in the application runtime
- **WHEN** an operator requests the reboot control
- **THEN** the system states that reboot was not executed
- **AND** it points the operator to the host-level restart guidance


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

---
### Requirement: Reuse display diagnostics outputs from shared services

The system SHALL reuse display diagnostics outputs from shared readiness, publish, or asset services instead of recomputing unrelated display state inside Device Status.

#### Scenario: Device Status exports display summary

- **WHEN** the page requests a display diagnostics export or refresh result
- **THEN** the returned data uses the same underlying display-operation findings as other management surfaces
- **AND** the operator can correlate the result with current display issues

##### Example: Exported summary matches current readiness and publish findings

- **GIVEN** the device status page shows one skipped page and one pending draft backlog item
- **WHEN** the operator exports the display diagnostics summary
- **THEN** the exported summary uses those same skip and publish findings
- **AND** the operator can correlate the export with the current on-screen display issues

<!-- @trace
source: add-device-status-display-ops-observability
updated: 2026-05-19
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .hermes/codex_goal2.md
  - apps/web/src/layouts/offlineRouting.ts
  - apps/server/src/routes/imagesSupport.ts
  - .hermes/codex_goal2_remaining.md
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - AGENTS.md
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - packages/shared/src/index.ts
  - apps/web/src/components/LeafOrnament.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - .hermes/codex_goal1_change2.md
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/web/src/components/SectionWrapper.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - .hermes/codex_goal1_change2_remaining.md
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/imagePlaylist.ts
  - .hermes/plan_publish_safety.md
  - apps/web/src/components/PanelCard.tsx
  - .hermes/codex_goal1_change3.md
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .hermes/codex_goal3.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/main.tsx
  - packages/shared/src/displayRotation.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/AppFooterNav.tsx
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/types.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/hooks/usePageRotation.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - package.json
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - .hermes/codex_fix_bugs.md
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/web/src/services/api.ts
  - apps/server/src/app.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/images.ts
  - apps/server/src/routes/sustainability-story.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/package.json
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
-->