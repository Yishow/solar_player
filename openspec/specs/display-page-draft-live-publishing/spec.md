# display-page-draft-live-publishing Specification

## Purpose

TBD - created by archiving change 'strengthen-display-page-publishing-and-safety'. Update Purpose after archive.

## Requirements

### Requirement: Provide draft and live publishing channels for display page configuration

The system SHALL store display page configuration in separate `draft` and `live` channels so operators can edit pending changes without affecting the production playback routes. Shared display page configuration SHALL include template-based card rails when a page defines rail content.

#### Scenario: Editor saves a draft change

- **GIVEN** an operator is editing `Overview` in the display page editor
- **WHEN** the operator saves the current configuration without publishing it
- **THEN** the configuration is stored in the `draft` channel for that page
- **AND** the production playback route continues using the current `live` configuration

#### Scenario: Draft stores card rail content with the rest of page configuration

- **GIVEN** an operator is editing a page that defines a card rail
- **WHEN** the operator saves a draft containing card rail cards
- **THEN** the `draft` channel stores the rail container and card definitions together with the rest of the page configuration
- **AND** publishing the page promotes that same card rail contract into the `live` channel instead of using a separate rail-only store

##### Example: Sustainability draft stores a template-based rail

- **GIVEN** the Sustainability draft contains a card rail with two visible cards and one hidden card
- **WHEN** the operator saves the draft and later publishes it
- **THEN** the same card rail payload moves from `draft` to `live`
- **AND** preview and playback both resolve the published rail from the shared page configuration envelope


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
### Requirement: Support publish history and rollback for live display page configuration

The system SHALL create a new live version when a draft is published and SHALL allow operators to roll the live channel back to an earlier published version.

#### Scenario: A draft is published to live

- **WHEN** an operator publishes a validated draft configuration for a display page
- **THEN** the system records a new live version with publish metadata
- **AND** the production playback route uses that new live version

##### Example: Overview hero draft becomes the next live version

- **GIVEN** the `Overview` draft changes `heroCopyLayout.left` from `86` to `120`
- **WHEN** the operator publishes that validated draft
- **THEN** the system creates a new `live` version for `overview`
- **AND** the production `/overview` route starts rendering the hero copy at `120`

#### Scenario: An operator rolls back a live version

- **GIVEN** a display page has at least one earlier published version
- **WHEN** an operator requests rollback to that earlier version
- **THEN** the system restores that version as the active live configuration
- **AND** the rollback is visible in the publish history

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

---
### Requirement: Live publishing is launch-complete only after refresh witness passes

Display-page draft publishing SHALL NOT be treated as launch-complete unless the launch review confirms that a successful publish is followed by the expected live playback refresh and operator-visible confirmation.

#### Scenario: Publish flow requires a live refresh witness

- **WHEN** an operator publishes a display-page draft
- **THEN** launch review confirms the live playback reflects the published state
- **AND** the operator can distinguish a successful refresh from a save-only success message

##### Example: Shell or page draft publish must refresh the playback witness

- **GIVEN** an operator publishes a display-page or shell-related draft from the management surface
- **WHEN** the publish request succeeds
- **THEN** launch review confirms the playback witness updates to the newly published state
- **AND** a stale playback surface is treated as a failed live refresh witness

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-page-draft-live-publishing/spec.md
  - openspec/specs/display-launch-witness-gates/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-06-05
code:
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/web/src/styles/global.css
  - .agents/skills/spectra-analyze/SKILL.md
  - .agents/skills/spectra-verify/SKILL.md
tests:
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
-->