# images-playlist-management Specification

## Purpose

TBD - created by archiving change 'add-images-playlist-editor'. Update Purpose after archive.

## Requirements

### Requirement: Treat Images as a playlist domain with ordered entries

The system SHALL treat `Images` playback as an ordered playlist of entries with enabled state and per-entry duration.

#### Scenario: Operator reorders Images entries

- **WHEN** an operator changes the order or enabled state of Images playlist entries
- **THEN** the persisted playlist reflects the new sequence
- **AND** the `Images` display route uses that sequence when selecting slides

#### Scenario: Images runtime advances by per-entry duration

- **WHEN** the current playable `Images` slide reaches the configured `durationSeconds` for that resolved playlist entry
- **THEN** the `Images` display route SHALL advance to the next playable slide in the resolved playlist order
- **AND** the autoplay timer SHALL restart from the newly active slide's own duration

##### Example: Three playable entries rotate in order

- **GIVEN** the resolved playlist order is `IMG-01 (5s)`, `IMG-02 (8s)`, `IMG-03 (6s)`
- **WHEN** playback starts on `IMG-01`
- **THEN** the page advances to `IMG-02` after 5 seconds
- **AND** it advances to `IMG-03` after 8 more seconds

#### Scenario: Manual navigation keeps autoplay active

- **WHEN** an operator or viewer manually changes the active `Images` slide through arrows or thumbnails
- **THEN** the page SHALL immediately show the selected slide
- **AND** autoplay SHALL continue from that slide using its resolved duration instead of disabling the slideshow loop

#### Scenario: Fallback-active entries remain inside the slideshow loop

- **WHEN** the active resolved playlist entry is playable only through its configured fallback behavior
- **THEN** the `Images` display route SHALL keep that fallback slide active for the entry's duration
- **AND** it SHALL continue advancing to the next playable entry instead of aborting the playlist


<!-- @trace
source: add-images-playlist-autoplay-runtime
updated: 2026-05-22
code:
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/server.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - scripts/dev-lib.mjs
  - scripts/dev.test.mjs
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.mjs
  - apps/server/src/server-startup.ts
  - apps/web/src/components/AppFooterNav.tsx
tests:
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/server/src/server-startup.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
-->

---
### Requirement: Allow per-entry playback duration in Images playlist management

The system SHALL let each Images playlist entry define its own display duration.

#### Scenario: Playlist entry uses custom duration

- **WHEN** a playlist entry has a configured display duration
- **THEN** the Images playback logic uses that duration for the active slide
- **AND** management UI shows that configured duration

##### Example: Cover slide stays longer than gallery slides

- **GIVEN** playlist entry `IMG-01` is configured for `25` seconds and `IMG-02` for `10` seconds
- **WHEN** `IMG-01` becomes the active slide
- **THEN** the playback logic keeps `IMG-01` visible for `25` seconds
- **AND** the management UI shows that longer per-entry duration

<!-- @trace
source: add-images-playlist-editor
updated: 2026-05-19
code:
  - apps/server/src/routes/images.ts
  - apps/server/src/routes/circuits.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - packages/shared/src/deviceDisplayOps.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/main.tsx
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/web/src/components/PageContainer.tsx
  - .hermes/codex_goal2.md
  - apps/server/src/routes/display-story.ts
  - apps/web/src/pages/Solar/index.tsx
  - package.json
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/routes/device-display-ops.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/components/SectionWrapper.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/components/LeafOrnament.tsx
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - .hermes/codex_prompt_goal1_change1.md
  - apps/server/src/realtime/SocketService.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - .hermes/plan_publish_safety.md
  - apps/web/src/pages/Images/viewModel.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - AGENTS.md
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/server/src/routes/playback.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/routes/sustainability-story.ts
  - packages/shared/src/index.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/StatusBadge.tsx
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - .hermes/codex_fix_bugs.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/routes/device.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - .hermes/codex_goal1_change3.md
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/components/PanelCard.tsx
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - .hermes/codex_goal3.md
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/web/package.json
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/server/src/app.ts
  - packages/shared/src/displayStory.ts
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/web/src/pages/displayPageMediaStyle.ts
  - .hermes/codex_goal2_remaining.md
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
-->