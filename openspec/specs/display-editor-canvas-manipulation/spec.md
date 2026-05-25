# display-editor-canvas-manipulation Specification

## Purpose

TBD - created by archiving change 'strengthen-display-editor-canvas-workflow'. Update Purpose after archive.

## Requirements

### Requirement: Manipulate display editor geometry directly on canvas

The system SHALL let operators manipulate editable region geometry directly on the display editor canvas. When a page contains a supported card rail, the same canvas workflow SHALL also support dragging and resizing individual rail cards within that rail.

#### Scenario: Operator drags or resizes a region

- **WHEN** the operator drags or resizes an editable region on the canvas
- **THEN** the draft geometry updates to match that interaction
- **AND** the preview reflects the geometry change immediately

##### Example: Operator drags Overview hero copy to the right

- **GIVEN** the `Overview Hero Copy` region is selected in the editor
- **WHEN** the operator drags that region `24` pixels to the right
- **THEN** the draft `left` value updates by `24`
- **AND** the preview immediately shows the hero copy in the new position

#### Scenario: Operator drags a rail card within its parent rail

- **WHEN** the operator drags or resizes a supported rail card on the canvas
- **THEN** the draft updates that card's frame
- **AND** the resulting frame remains constrained to the parent rail bounds

##### Example: Household-equivalent card is clamped inside the Sustainability rail

- **GIVEN** a Sustainability card rail is `470` pixels wide
- **WHEN** the operator drags a household-equivalent card toward the right edge beyond the remaining space
- **THEN** the saved card frame stops at the rail boundary
- **AND** the preview shows the clamped card instead of allowing overflow beyond the rail


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
### Requirement: Support zoom, pan, and keyboard nudge during canvas editing

The system SHALL support zoom, pan, and keyboard nudge controls during display editor canvas editing. Keyboard nudging SHALL provide explicit step tiers so operators can choose fine, normal, or accelerated movement without leaving the canvas workflow.

#### Scenario: Operator nudges a selected region

- **WHEN** a region is selected and the operator uses keyboard nudge controls
- **THEN** the region moves by the configured increment
- **AND** the movement remains visible in the canvas preview

##### Example: Arrow key nudge moves Solar node by one step

- **GIVEN** a `Solar` flow node is selected
- **WHEN** the operator presses the right-arrow nudge shortcut once
- **THEN** that region moves by the configured single-step increment
- **AND** the preview reflects the nudge without requiring manual number entry

#### Scenario: Operator chooses a different nudge step tier

- **WHEN** a region is selected and the operator invokes a fine or accelerated nudge tier
- **THEN** the region moves by the design-space increment assigned to that tier
- **AND** the editor keeps that nudge inside the same undoable draft history workflow

##### Example: Accelerated nudge moves a KPI card by ten pixels

- **GIVEN** a KPI card is selected on the canvas
- **WHEN** the operator triggers the accelerated nudge tier once toward the right
- **THEN** the card moves right by `10` design-space pixels
- **AND** the operator can undo that move from the draft history

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
### Requirement: Render page-aligned guide overlays in the editor viewport with design-space mapping

The system SHALL render a dashed guide overlay inside the `DisplayEditorCanvasCard` viewport whenever edit mode is enabled for a supported display page. The overlay SHALL interpret guide geometry in a configurable design space whose default size is `1920x1080`, and it SHALL map that design space into the current viewport so the guides remain aligned while the operator switches pages, zooms, or pans.

#### Scenario: Operator opens edit mode on a supported page

- **WHEN** the operator enables edit mode on a supported display page
- **THEN** the canvas shows that page's guide overlay
- **AND** the guides remain aligned with the preview content after viewport scaling, zoom, and pan actions

##### Example: Overview page keeps guides aligned after zoom

- **GIVEN** `/display-pages/editor?page=overview` is open in edit mode
- **WHEN** the operator zooms the preview to `125%` and pans the canvas
- **THEN** the hero, content, and card-band guides remain anchored to the same Overview layout positions
- **AND** no separate unscaled guide layer appears outside the preview surface

#### Scenario: Viewport is smaller than the configured design space

- **WHEN** the editor viewport is smaller than the configured design-space width or height
- **THEN** the guide overlay still renders inside the current viewport
- **AND** its labels and measurements continue to use design-space coordinates instead of raw viewport pixels

##### Example: FHD guides are mapped into a narrower preview card

- **GIVEN** the configured design space is `1920x1080`
- **AND** the current `DisplayEditorCanvasCard` viewport is rendered at half that width
- **WHEN** edit mode is active
- **THEN** the dashed guide overlay is visibly compressed into the preview card
- **AND** the guide geometry still corresponds to the original `1920x1080` layout


<!-- @trace
source: add-display-editor-dimension-guides
updated: 2026-05-26
code:
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .codex/hooks.json
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->

---
### Requirement: Expose overlay display modes for selected-only and full-canvas framing

The system SHALL let operators change the display editor overlay mode from the controls shown with `DisplayEditorCanvasCard`. The available modes SHALL include a selected-only mode that emphasizes only the active region and a full-canvas mode that reveals page-wide guides and reference frames for all editable regions.

#### Scenario: Operator switches from selected-only mode to full-canvas mode

- **WHEN** the operator changes the overlay mode from selected-only to full-canvas
- **THEN** the editor immediately updates the visible guides and region frames inside the same viewport
- **AND** the change does not modify any saved region geometry

##### Example: Full-canvas mode reveals all region reference frames

- **GIVEN** the editor is open with one selected hero region
- **WHEN** the operator enables full-canvas overlay mode
- **THEN** the editor shows the page-wide dashed guides
- **AND** the other editable regions gain reference frames without becoming selected

#### Scenario: Selected-only mode keeps non-selected regions passive

- **WHEN** the selected-only overlay mode is active
- **THEN** only the selected region shows the primary framing treatment
- **AND** non-selected regions do not appear with the same emphasis as the active region

##### Example: Selecting one image tile no longer frames every other tile

- **GIVEN** an `Images` page contains multiple editable tiles
- **WHEN** the operator selects a single tile while selected-only mode is active
- **THEN** the chosen tile shows the primary frame
- **AND** the remaining tiles do not receive matching full-strength selection frames


<!-- @trace
source: add-display-editor-dimension-guides
updated: 2026-05-26
code:
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .codex/hooks.json
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->

---
### Requirement: Persist and restore overlay guide presets

The system SHALL let operators configure guide presets from `DisplayEditorCanvasCard` controls, including design-space presets, axis or tick visibility, center-line visibility, region labels, and full-canvas frame density options. The editor SHALL restore the most recent valid preset when the operator returns to the editor.

#### Scenario: Operator changes overlay preset options

- **WHEN** the operator updates an overlay preset option from the canvas controls
- **THEN** the current viewport immediately reflects that setting
- **AND** the setting remains available when the operator returns to the editor later

##### Example: Operator keeps FHD axes and region labels enabled

- **GIVEN** the operator enables `1920x1080` design-space preset, axis ticks, and region labels
- **WHEN** the operator leaves and later reopens `Display Pages Editor`
- **THEN** the editor restores that same preset combination
- **AND** the reopened overlay shows axis ticks and region labels without requiring manual reconfiguration

#### Scenario: Editor falls back from an invalid stored preset

- **WHEN** the editor cannot parse the last stored overlay preset
- **THEN** the overlay falls back to the default preset
- **AND** the operator can continue editing without losing canvas interaction

##### Example: Broken preset storage falls back to default FHD overlay

- **GIVEN** the stored overlay preset payload is malformed
- **WHEN** the operator opens `Display Pages Editor`
- **THEN** the editor falls back to its default overlay preset
- **AND** the canvas remains interactive with the default `1920x1080` design-space settings


<!-- @trace
source: add-display-editor-dimension-guides
updated: 2026-05-26
code:
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .codex/hooks.json
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->

---
### Requirement: Show live dimensions for the selected canvas region

The system SHALL show live dimension feedback for the selected editable region or selected card rail child card. During drag or resize interactions, the feedback SHALL update the region size and the distances to its editable container bounds in real time using design-space values. Locked regions SHALL remain selectable but SHALL NOT enter active drag or resize measurement states.

#### Scenario: Operator drags or resizes a selected region

- **WHEN** the operator drags or resizes a selected editable region
- **THEN** the canvas shows the region width and height
- **AND** the canvas shows distances from that region to the active container bounds
- **AND** the feedback updates as the geometry changes

##### Example: Rail card measurements use the parent rail bounds

- **GIVEN** a selected card rail child is constrained by a `470` pixel wide parent rail
- **WHEN** the operator drags the card toward the right boundary
- **THEN** the measurement feedback reports distances relative to that parent rail
- **AND** the card does not report distances relative to the full page surface

#### Scenario: Operator selects a locked region

- **WHEN** the operator selects a locked region
- **THEN** the region remains selectable on the canvas
- **AND** the canvas does not enter an active drag or resize measurement state for that region

##### Example: Locked Overview hero copy stays passive

- **GIVEN** the `Overview Hero Copy` region is locked in edit mode
- **WHEN** the operator clicks that region on the canvas
- **THEN** the editor keeps that region selected
- **AND** the canvas does not start drag or resize measurements for it

<!-- @trace
source: add-display-editor-dimension-guides
updated: 2026-05-26
code:
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .codex/hooks.json
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->