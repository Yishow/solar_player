# factory-circuit-slot-binding-and-alerts Specification

## Purpose

TBD - created by archiving change 'add-display-monitoring-story-semantic-models'. Update Purpose after archive.

## Requirements

### Requirement: Replace Factory Circuit load heuristics with explicit slot binding

The system SHALL let `Factory Circuit` bind load rows to explicit display slots instead of inferring them only from circuit icon or name, and SHALL re-resolve the fallback circuit rows from the latest circuits snapshot whenever the runtime fallback source receives a relevant sync invalidation.

#### Scenario: Circuit is assigned to a display slot

- **WHEN** a circuit is bound to a named `Factory Circuit` display slot
- **THEN** the corresponding load row uses that circuit's runtime values
- **AND** unbound slots remain distinguishable from populated ones

#### Scenario: Fallback rows refresh after relevant sync invalidation

- **GIVEN** the `Factory Circuit` page is currently filling missing story slots from circuits fallback data
- **WHEN** a `display:sync` event with scope `circuits` or `display-pages` arrives
- **THEN** the page reloads the circuits fallback source before the next settled render
- **AND** the fallback rows reflect the latest slot binding and enablement without requiring a full page reload

##### Example: Updated slot assignment replaces stale fallback rows

- **GIVEN** the last settled fallback rows showed circuit `A` in slot `hvac`
- **AND** the latest circuits source now binds circuit `B` to slot `hvac`
- **WHEN** the runtime handles `display:sync(scope=circuits)`
- **THEN** the next settled `hvac` row shows circuit `B` instead of circuit `A`

#### Scenario: Refresh failure preserves the last settled fallback rows

- **GIVEN** the `Factory Circuit` page already rendered fallback rows from a prior successful circuits load
- **WHEN** a later sync-triggered circuits refresh fails
- **THEN** the page keeps the last settled fallback rows visible
- **AND** the runtime surfaces the refresh failure through its existing fallback or error state instead of blanking the layout


<!-- @trace
source: refresh-factory-circuit-fallback-state-on-config-sync
updated: 2026-05-22
code:
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/cloneValue.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/server.ts
  - packages/shared/src/displayPageCardRail.ts
  - scripts/dev.test.mjs
  - scripts/dev-lib.mjs
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
tests:
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
-->

---
### Requirement: Provide alert reasons for Factory Circuit load rows

The system SHALL expose alert reasons for `Factory Circuit` rows when a load enters warning, attention, or missing-data states.

#### Scenario: Load row enters warning state

- **WHEN** a bound circuit exceeds its warning threshold or loses expected data
- **THEN** the `Factory Circuit` story model includes an alert reason for that row
- **AND** the route can present a deterministic status explanation

<!-- @trace
source: add-display-monitoring-story-semantic-models
updated: 2026-05-19
code:
  - packages/shared/src/index.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - .hermes/codex_goal4.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/StatusBadge.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/hooks/useDisplayOpsSummary.ts
  - .hermes/codex_goal3.md
  - apps/web/src/hooks/useDisplayReadiness.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/hooks/useImageAssetReferences.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - .hermes/codex_goal1_change2.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/hooks/useDeviceDisplayOpsSummary.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/displayEditorSchema.ts
  - AGENTS.md
  - apps/web/src/components/SectionWrapper.tsx
  - .superpowers/brainstorm/4903-1779123645/state/server.pid
  - apps/web/src/components/PageContainer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/DisplayCanvas.tsx
  - apps/server/src/routes/circuits.ts
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/CircuitSettings/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/PlaybackSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorRegionState.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - .hermes/codex_goal2.md
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/components/PlaybackTitleGroup.tsx
  - apps/server/src/routes/display-pages-asset-governance-placement.test-suite.ts
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - .hermes/codex_goal1_change2_remaining.md
  - .superpowers/brainstorm/4903-1779123645/content/design-3col.html
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/routes/display-pages-asset-governance-health.test-suite.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - packages/shared/src/imagePlaylist.ts
  - apps/server/src/db/migrations/008_display_readiness_slots.sql
  - .superpowers/brainstorm/4903-1779123645/content/editor-layouts.html
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/server/src/routes/display-pages-asset-governance.test-support.ts
  - apps/server/src/db/migrations/007_display_page_publishing.sql
  - apps/web/src/pages/ImageManagement/index.tsx
  - apps/server/src/routes/device.ts
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/package.json
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/history.ts
  - apps/web/src/components/AppHeader.tsx
  - .hermes/plan_publish_safety.md
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/PlaybackSettings/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - packages/shared/src/displayRotation.ts
  - packages/shared/src/deviceDisplayOps.ts
  - .hermes/codex_goal1_change3.md
  - package.json
  - .superpowers/brainstorm/4903-1779123645/state/server.log
  - .hermes/codex_prompt_goal1_change1.md
  - apps/web/src/layouts/offlineRouting.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorValidation.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - packages/shared/src/sustainabilityStory.ts
  - .hermes/codex_fix_bugs.md
  - apps/server/src/routes/display-ops.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/rotationPreview.ts
  - apps/server/src/routes/sustainability-story.ts
  - apps/web/src/pages/Solar/viewModel.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/main.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/display-story.ts
  - docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md
  - apps/server/src/services/deviceDisplayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/hooks/useDisplaySyncRefresh.ts
  - .hermes/codex_goal2_remaining.md
  - apps/web/src/hooks/displayPageConfigPaths.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx
  - apps/web/src/components/LeafOrnament.tsx
  - apps/server/src/routes/device-display-ops.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/web/src/pages/DisplayPagesEditor/fallbackPageDefinitions.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/services/socket.ts
  - apps/server/src/routes/playback.ts
  - apps/web/src/hooks/displayPageDraftSession.ts
  - .superpowers/brainstorm/4903-1779123645/content/waiting-1.html
  - packages/shared/src/types.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/components/DisplayReadinessPanel.tsx
  - apps/web/src/components/SectionTitle.tsx
  - apps/web/src/components/PanelCard.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts
  - .superpowers/brainstorm/4903-1779123645/state/server-stopped
  - apps/web/src/hooks/useDisplayPageAssetHealth.ts
  - apps/web/src/hooks/useDisplayEditor.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.ts
  - apps/server/src/routes/display-readiness.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
tests:
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/PlaybackSettings/viewModel.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - apps/web/src/pages/DisplayPagesEditor/history.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/server/src/services/imagePlaylistService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/web/src/pages/PlaybackSettings/index.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/server/src/routes/device-display-ops.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/routes/display-pages-asset-governance.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/hooks/useDisplayEditor.test.ts
  - apps/server/src/routes/image-playlist.test.ts
  - apps/server/src/routes/display-pages-fallback.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->