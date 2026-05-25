# display-editor-alignment-tools Specification

## Purpose

TBD - created by archiving change 'add-display-editor-alignment-and-snap-toolkit'. Update Purpose after archive.

## Requirements

### Requirement: Snap editable regions to guides, region edges, and center lines

The system SHALL let operators snap editable regions to explicit snap targets, including editor guides, region edges, region centers, and canvas center lines.

#### Scenario: Operator drags a region near a snap target

- **WHEN** the operator drags a selected region near an enabled snap target
- **THEN** the region snaps to that target in design-space coordinates
- **AND** the canvas shows which target was used

##### Example: Hero media snaps to the vertical center line

- **GIVEN** center-line snapping is enabled
- **WHEN** the operator drags `Overview Hero Media` near the page center
- **THEN** the region snaps to the vertical center line
- **AND** the canvas indicates that center-line snap target


<!-- @trace
source: add-display-editor-alignment-and-snap-toolkit
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - AGENTS.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Maintain temporary distance locks during active geometry edits

The system SHALL let operators apply a temporary distance lock during a drag or resize session so the selected region can preserve a specified gap or equal-spacing relationship without creating a persistent layout constraint.

#### Scenario: Operator drags with distance lock enabled

- **WHEN** the operator drags or resizes a selected region while a temporary distance lock is active
- **THEN** the interaction preserves the locked spacing relationship for that session
- **AND** the lock ends when that interaction session ends

##### Example: Two KPI cards keep a locked gap during drag

- **GIVEN** two KPI cards are `24` design-space pixels apart
- **WHEN** the operator activates a distance lock and drags one card
- **THEN** the editor preserves that `24` pixel gap during that drag session
- **AND** the lock does not persist automatically into a later unrelated drag session


<!-- @trace
source: add-display-editor-alignment-and-snap-toolkit
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - AGENTS.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Align and distribute multiple selected regions

The system SHALL let operators align or distribute multiple selected regions using the selected set's bounding box as the stable reference frame.

#### Scenario: Operator aligns several selected regions

- **WHEN** the operator applies a multi-select align command to multiple selected regions
- **THEN** those regions align to the requested shared edge or center in design-space coordinates
- **AND** the resulting geometry remains part of the current draft session

##### Example: Three stat cards align to the same top edge

- **GIVEN** three selected stat cards have different `top` values
- **WHEN** the operator invokes top alignment
- **THEN** the three cards share the same `top` coordinate
- **AND** each card keeps its original size

#### Scenario: Operator distributes several selected regions

- **WHEN** the operator applies a multi-select distribute command to multiple selected regions
- **THEN** the editor spaces those regions evenly within the selected set bounds
- **AND** the result is computed from design-space geometry rather than viewport pixels

##### Example: Four cards distribute evenly across a band

- **GIVEN** four selected cards span a horizontal band
- **WHEN** the operator invokes horizontal distribute
- **THEN** the gaps between adjacent cards become equal
- **AND** the outermost cards remain anchored to the selected set bounds

<!-- @trace
source: add-display-editor-alignment-and-snap-toolkit
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/SlideshowPreview/preview.css
  - AGENTS.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->