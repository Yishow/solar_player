# display-editor-region-navigation Specification

## Purpose

TBD - created by archiving change 'strengthen-display-editor-canvas-workflow'. Update Purpose after archive.

## Requirements

### Requirement: Keep region navigation separate from visual overlay

The system SHALL provide region navigation separate from the visual overlay so operators can locate, select, and lock regions even when the canvas is crowded. When a page contains a card rail, the navigation tree SHALL also expose the rail's child cards as selectable items.

#### Scenario: Operator selects region from navigation tree

- **WHEN** the operator selects a region from the navigation tree
- **THEN** the corresponding canvas region becomes selected
- **AND** the inspector follows that selected region

##### Example: Navigation tree selects the Sustainability highlight rail

- **GIVEN** the navigation tree lists `Sustainability Highlight Rail`
- **WHEN** the operator clicks that tree item
- **THEN** the highlight rail region becomes selected on the canvas
- **AND** the inspector switches to that region's fields

#### Scenario: Navigation tree selects an individual rail card

- **WHEN** the navigation tree lists child cards under a supported card rail
- **AND** the operator selects one of those child cards
- **THEN** the corresponding rail card becomes selected on the canvas
- **AND** the inspector switches to that card's template-aware fields instead of the parent rail container

##### Example: Navigation tree selects the cumulative household card

- **GIVEN** the Sustainability card rail contains a `cumulative` household-equivalent card
- **WHEN** the operator clicks that card from the navigation tree
- **THEN** the cumulative card becomes the selected authoring item
- **AND** the inspector shows the cumulative card fields


<!-- @trace
source: extend-display-editor-with-card-rail-authoring
updated: 2026-05-22
code:
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/index.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - scripts/dev-lib.mjs
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
-->

---
### Requirement: Support locked regions in display editor navigation

The system SHALL support locked regions that stay visible but cannot be manipulated until unlocked.

#### Scenario: Locked region blocks accidental manipulation

- **WHEN** a region is locked in navigation
- **THEN** the canvas keeps showing that region
- **AND** direct manipulation is prevented until the region is unlocked

##### Example: Locked hero media cannot be dragged

- **GIVEN** the operator locks a hero media region from the navigation tree
- **WHEN** the operator tries to drag that region on the canvas
- **THEN** the region remains visible but does not move
- **AND** dragging becomes available again only after the region is unlocked

<!-- @trace
source: strengthen-display-editor-canvas-workflow
updated: 2026-05-19
code:
  - apps/server/src/routes/display-story.ts
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/components/StatusBadge.tsx
  - .hermes/codex_goal2_remaining.md
  - AGENTS.md
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/services/displayRotationService.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - packages/shared/src/displayOps.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - .hermes/plan_publish_safety.md
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/Images/index.tsx
  - .hermes/codex_fix_bugs.md
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/pages/ImageManagement/index.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - apps/web/src/components/SectionWrapper.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - package.json
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .hermes/codex_goal2.md
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - packages/shared/src/displayRotation.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/TitleBlock.tsx
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/PanelCard.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - .hermes/codex_goal1_change2.md
  - packages/shared/src/sustainabilityStory.ts
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/images.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - .hermes/codex_goal3.md
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/SectionTitle.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/PageContainer.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/web/package.json
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - .hermes/codex_goal1_change3.md
  - .hermes/codex_goal4.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/usePageRotation.ts
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
tests:
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
-->