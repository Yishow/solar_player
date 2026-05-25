# display-surface-visual-guardrails Specification

## Purpose

TBD - created by archiving change 'add-display-surface-visual-guardrails'. Update Purpose after archive.

## Requirements

### Requirement: Provide a display surface visual review checklist

The implementation SHALL provide a repeatable visual review checklist for playback display pages so future changes can preserve the shared display-wall visual family while allowing content variation.

#### Scenario: Display page visual changes are reviewed consistently

- **WHEN** a change modifies playback page visuals, shared display chrome, card family styling, live preview presentation, or FHD geometry
- **THEN** the change references or follows the display surface visual review checklist
- **AND** the checklist covers hero typography, photo fade, card family, ornament consistency, preview mode, FHD geometry, and distance readability
- **AND** any intentional deviation from shared primitives is documented

##### Example: Playback visual change references the checklist

- **GIVEN** a change updates shared display chrome or playback-page presentation
- **WHEN** reviewers inspect the change artifact or review note
- **THEN** they can find `docs/display-surface-visual-review-checklist.md`
- **AND** the note records any shared primitive or geometry exceptions


<!-- @trace
source: add-display-surface-visual-guardrails
updated: 2026-05-26
code:
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - docs/display-assets/README.md
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/styles/global.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/PageContainer.tsx
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Guard shared primitive adoption with lightweight tests or assertions

The implementation SHALL use lightweight tests or assertions to guard core shared primitive contracts for display playback pages without requiring a heavy screenshot-diff service.

#### Scenario: Tests catch common display-surface drift

- **WHEN** shared display primitives, live preview presentation, runtime page definitions, or seed geometry are changed
- **THEN** targeted tests or assertions cover the relevant contract
- **AND** the tests can run in the existing web test/typecheck workflow
- **AND** the guardrails do not require an external visual snapshot service

##### Example: Showcase preview mode stays explicit

- **GIVEN** slideshow preview cards embed live display page previews
- **WHEN** tests inspect the slideshow preview card renderer
- **THEN** the embedded preview requests showcase presentation mode
- **AND** editor-mode default behavior remains covered separately


<!-- @trace
source: add-display-surface-visual-guardrails
updated: 2026-05-26
code:
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - docs/display-assets/README.md
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/styles/global.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/PageContainer.tsx
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Protect FHD geometry from accidental style refactors

The implementation SHALL treat playback page FHD geometry as a protected contract so visual cleanup work does not accidentally move display regions.

#### Scenario: Geometry movement is intentional and reviewable

- **WHEN** a change modifies `left`, `top`, `width`, or `height` values in display page layouts, seed configs, or runtime config defaults
- **THEN** the change identifies the geometry movement as intentional
- **AND** tests, fixtures, or manual checklist review confirm the movement is expected
- **AND** style-only refactors do not silently change FHD geometry


<!-- @trace
source: add-display-surface-visual-guardrails
updated: 2026-05-26
code:
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - docs/display-assets/README.md
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/styles/global.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/PageContainer.tsx
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Guard semantic token usage for shared display chrome roles

The implementation SHALL guard semantic token usage for common display chrome roles while allowing documented exceptions for cases that cannot be cleanly tokenized.

#### Scenario: Shared chrome roles avoid new raw color drift

- **WHEN** a change adds or edits CSS for shared display chrome roles such as hero title, emphasis, card surface, photo fade, or ornaments
- **THEN** those roles use display semantic tokens where a token exists
- **AND** raw literal exceptions are documented when needed for data URI SVGs, masks, or specialized gradients

##### Example: Shared chrome file keeps semantic token roles

- **GIVEN** `displaySurfaceChrome.css` defines hero, fade, and ornament roles
- **WHEN** a guardrail test scans the shared chrome file
- **THEN** hero/fade/ornament properties continue to reference `var(--display-...)` tokens
- **AND** raw color literals remain limited to documented exception cases outside shared chrome roles

<!-- @trace
source: add-display-surface-visual-guardrails
updated: 2026-05-26
code:
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - docs/display-assets/README.md
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/styles/global.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/components/PageContainer.tsx
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .codex/hooks.json
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/TitleBlock.tsx
tests:
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->