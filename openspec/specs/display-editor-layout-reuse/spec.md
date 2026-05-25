# display-editor-layout-reuse Specification

## Purpose

TBD - created by archiving change 'strengthen-display-editor-canvas-workflow'. Update Purpose after archive.

## Requirements

### Requirement: Reuse layout adjustments within an editor session

The system SHALL let operators reuse layout adjustments by resetting to seed values or copying and pasting geometry between compatible regions. Geometry reuse SHALL also support named partial subsets and batch paste across multiple compatible targets within the same draft session.

#### Scenario: Operator pastes geometry into another region

- **WHEN** an operator copies geometry from one compatible region and pastes it into another
- **THEN** the destination region adopts that geometry
- **AND** the change remains part of the editable draft session

##### Example: Operator copies one KPI card geometry to another

- **GIVEN** two `Overview` KPI regions are marked as geometry-compatible
- **WHEN** the operator copies the geometry from one KPI region and pastes it into the other
- **THEN** the destination KPI adopts the copied rectangle
- **AND** the updated geometry remains part of the current unsaved draft

#### Scenario: Operator pastes only a named geometry subset

- **WHEN** an operator chooses a named geometry subset such as `position`, `size`, or `full-frame`
- **THEN** the destination region applies only that subset of the copied geometry
- **AND** the remaining geometry values stay unchanged

##### Example: Operator pastes only position into a second badge

- **GIVEN** two compatible badge regions differ in both size and position
- **WHEN** the operator pastes the `position` subset from the first badge into the second
- **THEN** the second badge adopts the first badge's `left` and `top` values
- **AND** the second badge keeps its original `width` and `height`

#### Scenario: Operator batch-pastes geometry into multiple compatible targets

- **WHEN** an operator selects multiple compatible paste targets for the same copied geometry
- **THEN** each compatible target receives the requested geometry subset
- **AND** the entire batch remains part of the current draft history

##### Example: Operator batch-pastes full-frame geometry into three cards

- **GIVEN** three selected `Overview` stat cards share the same geometry compatibility key
- **WHEN** the operator batch-pastes a copied `full-frame` geometry into those three cards
- **THEN** all three cards adopt the copied rectangle
- **AND** the operator can undo that batch paste from the draft history

#### Scenario: Operator targets an incompatible region

- **WHEN** an operator tries to paste copied geometry into a region with an incompatible geometry contract
- **THEN** the editor rejects that target
- **AND** the editor leaves the current draft geometry unchanged for that target

##### Example: KPI geometry cannot paste into a hero media frame

- **GIVEN** a copied `Overview` KPI card geometry and a hero media region with a different compatibility key
- **WHEN** the operator attempts to paste that copied geometry into the hero media region
- **THEN** the editor rejects the paste for that target
- **AND** the hero media region keeps its existing geometry


<!-- @trace
source: extend-display-editor-layout-reuse-productivity
updated: 2026-05-26
code:
  - .codex/hooks.json
  - apps/web/src/styles/global.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/styles/tokens.css
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Overview/overview.css
tests:
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
-->

---
### Requirement: Persist editor history per page session

The system SHALL provide undo and redo for layout changes within the current page session before the draft is saved.

#### Scenario: Operator undoes a geometry change

- **WHEN** the operator triggers undo after a layout change in the current page session
- **THEN** the most recent unsaved canvas change is reverted
- **AND** redo can restore it until the history branch changes

##### Example: Undo restores the previous Factory Circuit load row rectangle

- **GIVEN** the operator has just resized a `Factory Circuit` load row
- **WHEN** the operator triggers undo
- **THEN** the row geometry returns to the previous unsaved rectangle
- **AND** redo can reapply the resize until a different edit is made

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