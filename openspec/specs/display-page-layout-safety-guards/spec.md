# display-page-layout-safety-guards Specification

## Purpose

TBD - created by archiving change 'strengthen-display-page-publishing-and-safety'. Update Purpose after archive.

## Requirements

### Requirement: Run layout safety guards before publish

The system SHALL validate display page draft configuration before publish and SHALL block publishing when blocking layout or content errors are present. When a page defines a card rail, the validation SHALL also check each visible rail card's frame and template-required content.

#### Scenario: Blocking validation prevents publish

- **GIVEN** a draft configuration places a required region outside the FHD canvas or omits a required field
- **WHEN** an operator tries to publish the draft
- **THEN** the publish request is rejected
- **AND** the response includes the blocking validation findings

#### Scenario: Rail card frame exceeds the rail container

- **GIVEN** a draft page contains a visible rail card whose frame extends outside the saved card rail container
- **WHEN** the operator tries to publish the draft
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending rail card instead of only the parent rail region

##### Example: Visible rail card overflows the right edge

- **GIVEN** a card rail container with `left=68`, `width=470`
- **AND** a visible card inside that rail stores `left=420`, `width=140`
- **WHEN** the operator publishes the draft
- **THEN** the publish is blocked because the card extends beyond the rail width
- **AND** the finding names that rail card as out of bounds

#### Scenario: Visible rail card is missing template-required content

- **GIVEN** a visible rail card uses a known template
- **WHEN** the saved payload omits a field required by that template contract
- **THEN** the publish request is rejected
- **AND** the validation findings identify the missing template content rather than allowing an incomplete live card


<!-- @trace
source: generalize-display-page-highlight-rails-to-card-rails
updated: 2026-05-22
code:
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - scripts/dev-lib.mjs
  - packages/shared/src/cloneValue.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/layouts/LayoutShell.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
-->

---
### Requirement: Surface layout safety guards results in the editor workflow

The display page editor SHALL show layout safety guards results for the selected draft so operators can correct issues before retrying publish.

#### Scenario: Editor shows validation feedback

- **WHEN** validation finds overlapping KPI cards or an invalid geometry value in a draft
- **THEN** the editor shows the findings with region-level context
- **AND** the draft remains editable until the issues are resolved

##### Example: Solar publish is blocked by overlapping KPI cards

- **GIVEN** a `Solar` draft moves `generation` and `efficiency` KPI cards to the same rectangle
- **WHEN** validation runs before publish
- **THEN** the editor shows both region ids in the findings list
- **AND** the operator can continue editing the draft without changing the current live page

<!-- @trace
source: strengthen-display-page-publishing-and-safety
updated: 2026-05-19
code:
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/components/LeafOrnament.tsx
  - .hermes/codex_goal3.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - .hermes/codex_goal4.md
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/server/src/routes/device.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/services/displayReadinessService.ts
  - .hermes/codex_goal2.md
  - .hermes/codex_goal1_change3.md
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/routes/display-story.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/components/SectionWrapper.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/Images/viewModel.ts
  - packages/shared/src/displayRotation.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/server/src/routes/settings-mqtt.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - apps/web/src/services/api.ts
  - .hermes/codex_goal2_remaining.md
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/services/socket.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - .hermes/plan_publish_safety.md
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/package.json
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/components/StatusBadge.tsx
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - AGENTS.md
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - packages/shared/src/displayStory.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/playback.ts
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - .hermes/codex_fix_bugs.md
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/components/PanelCard.tsx
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/server/src/routes/images.ts
  - package.json
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/display-ops.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/hooks/usePlaybackController.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/main.tsx
  - apps/web/src/components/PlaybackTitleGroup.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->