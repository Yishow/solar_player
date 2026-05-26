# display-page-media-placement-controls Specification

## Purpose

TBD - created by archiving change 'add-display-page-asset-governance'. Update Purpose after archive.

## Requirements

### Requirement: Provide per-binding media placement controls for display pages

The system SHALL provide media placement controls per display-page media binding, including focal point, fit behavior, alignment settings, and any supported effect settings that belong to that same hero or media surface.

#### Scenario: Operator adjusts hero placement

- **WHEN** an operator changes the placement controls for a hero or stage image
- **THEN** the editor preview reflects the new crop and alignment
- **AND** the production playback route uses the same placement settings after publish

##### Example: Overview hero image shifts focus to the left

- **GIVEN** the `Overview` hero image is bound to a managed asset
- **WHEN** the operator changes `focusX` from `0.5` to `0.3` with `cover` fit mode
- **THEN** the editor preview shows more content from the left side of the asset
- **AND** publishing preserves that same crop in production playback

#### Scenario: Operator combines placement and supported effect controls on one surface

- **WHEN** an operator adjusts both the placement settings and supported effect controls for the same hero or media surface
- **THEN** the editor preview applies those settings together
- **AND** the production playback route resolves the same combined placement and effect result after publish

##### Example: Overview hero keeps left focus with a softer left-edge fade

- **GIVEN** the `Overview` hero image is bound to a managed asset
- **WHEN** the operator sets `focusX=0.3` and applies a supported left-edge fade adjustment for that hero surface
- **THEN** the editor preview shows the asset focused to the left with the updated fade treatment
- **AND** production playback resolves the same crop and fade combination


<!-- @trace
source: add-display-page-effect-controls
updated: 2026-05-26
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/managementDraftSave.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->

---
### Requirement: Keep media placement controls within safe bounds

The system SHALL validate media placement control values so invalid coordinates or unsupported fit modes do not enter the saved configuration.

#### Scenario: Invalid placement value is submitted

- **WHEN** the client submits out-of-range focal coordinates or an unsupported fit mode
- **THEN** the system rejects or normalizes the invalid values
- **AND** the response explains the placement control issue

##### Example: Client submits an out-of-range focal point

- **GIVEN** a save request sends `focusX = 1.7` for an `Images` main stage binding
- **WHEN** the server validates the placement payload
- **THEN** the invalid focal value is rejected or clamped according to policy
- **AND** the response names the offending field instead of silently accepting it

<!-- @trace
source: add-display-page-asset-governance
updated: 2026-05-19
code:
  - packages/shared/src/imagePlaylist.ts
  - .hermes/codex_goal3.md
  - apps/web/src/services/socket.ts
  - apps/server/src/services/displayOpsService.ts
  - packages/shared/src/displayRotation.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/Solar/index.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - .hermes/codex_goal2_remaining.md
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/deviceDisplayOps.ts
  - apps/web/src/components/PageNumberPill.tsx
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/server/src/db/seed.ts
  - apps/web/src/main.tsx
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Images/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFieldBuilders.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/web/src/hooks/usePageRotation.ts
  - packages/shared/src/sustainabilityStory.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .hermes/codex_goal1_change3.md
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/components/StatusBadge.tsx
  - apps/server/src/services/displayRotationService.ts
  - .hermes/plan_publish_safety.md
  - apps/web/package.json
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/routes/display-pages.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - .hermes/codex_goal2.md
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/SectionTitle.tsx
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/components/AppFooterNav.tsx
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/services/api.ts
  - apps/web/src/components/TitleBlock.tsx
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/components/SectionWrapper.tsx
  - .hermes/codex_goal4.md
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/offlineRouting.ts
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/components/PanelCard.tsx
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - package.json
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/routes/image-playlist.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/index.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - .hermes/codex_fix_bugs.md
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->