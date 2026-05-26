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

---
### Requirement: Preserve playback visual canonicals from FHD witnesses

The implementation SHALL treat the playback page visual canonicals as protected contracts when a change modifies playback page visuals, shared display chrome, display card family styling, or live preview presentation. These canonicals SHALL include hero hierarchy, card-family rhythm, photo fade treatment, ornament consistency, source-like icon language, page-specific absolute composition, and distance readability.

#### Scenario: Playback visual cleanup keeps protected canonicals

- **WHEN** a change updates the visual styling of `/overview`, `/solar`, `/factory-circuit`, `/images`, or `/sustainability`
- **THEN** the change preserves the protected playback visual canonicals for the affected page
- **AND** the review notes identify which canonical attributes were intentionally preserved or intentionally changed

##### Example: Overview cleanup does not flatten the hero composition

- **GIVEN** `/overview` contains a hero region, KPI family, ornaments, and photo fade treatment in the FHD witness
- **WHEN** a developer adjusts spacing, card styling, or shared display chrome
- **THEN** the updated page keeps the hero-first visual hierarchy and distance-readable focus order
- **AND** the change does not silently replace the hero region with generic management boards or dashboard widgets

<!-- @trace
source: protect-fhd-visual-canonicals
updated: 2026-05-27
code:
  - openspec/specs/display-surface-visual-guardrails/spec.md
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/playback-visual-canonicals.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Treat FHD witness pairs as the canonical comparison source

The implementation SHALL use an explicit witness pair for playback visual review: the page-level reference image under `docs/reference/FHD/` and the corresponding structured prototype artifact under `docs/reference/kuozui-green-fhd-html-prototype/`. Playback visual review SHALL NOT rely only on local taste or implementation convenience.

#### Scenario: Playback visual review names the witness pair

- **WHEN** a change modifies playback visuals or shared display chrome
- **THEN** the review artifact names the corresponding FHD witness image and prototype witness document for each affected page
- **AND** any intentional deviation records why the witness was not followed exactly

##### Example: Solar page review cites both witnesses

- **GIVEN** a change updates `/solar`
- **WHEN** the author prepares the review evidence
- **THEN** the evidence references `docs/reference/FHD/02-2.Solar (大).png`
- **AND** it also references the corresponding `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/02-solar-spec.md` or equivalent structured witness

<!-- @trace
source: protect-fhd-visual-canonicals
updated: 2026-05-27
code:
  - openspec/specs/display-surface-visual-guardrails/spec.md
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/playback-visual-canonicals.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Prevent management-surface drift inside playback focus regions

The implementation SHALL NOT introduce management-surface primitives, generic dashboard card language, table-first control groupings, or toolbar-style icon treatment into playback focus regions unless the change documents a page-specific exception and explains why the playback visual canonical cannot be preserved.

#### Scenario: Shared primitive reuse does not override playback composition

- **WHEN** a change reuses a shared primitive inside a playback page
- **THEN** the reused primitive does not replace the page's protected hero, KPI, media, or focus composition with management-surface presentation
- **AND** the change documents any exception where playback-specific composition cannot reuse the primitive directly

##### Example: Shared board reuse is rejected for a hero region

- **GIVEN** a shared management board already exists in the repo
- **WHEN** a developer evaluates using that board as the primary visual container for an Overview hero or Solar focus region
- **THEN** the change is treated as management-surface drift unless it documents a page-specific exception
- **AND** the default expectation remains playback-specific composition rather than dashboard-style reuse

<!-- @trace
source: protect-fhd-visual-canonicals
updated: 2026-05-27
code:
  - openspec/specs/display-surface-visual-guardrails/spec.md
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/playback-visual-canonicals.md
  - docs/reference-match/all-pages-checklist.md
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->

---
### Requirement: Visual review checklist remains part of the AI-authored change workflow

The implementation SHALL integrate the display surface visual review checklist into the AI-authored frontend workflow for FHD-affecting changes. The checklist SHALL be referenced by the evidence bundle rather than remaining a detached optional document.

#### Scenario: Evidence bundle links back to the checklist

- **WHEN** an AI-authored change prepares visual review evidence
- **THEN** the evidence bundle references the display surface visual review checklist
- **AND** any skipped or exceptional checklist item is recorded explicitly

##### Example: Playback polish bundle records one skipped item

- **GIVEN** an AI-authored change updates `/solar` and `/overview`
- **WHEN** the author marks the photo fade checklist item as intentionally different on `/solar`
- **THEN** the evidence bundle links back to the checklist entry
- **AND** the skipped item is recorded with an explicit exception note instead of disappearing from review

<!-- @trace
source: add-ai-frontend-fhd-evidence-workflow
updated: 2026-05-27
code:
  - openspec/specs/display-surface-visual-guardrails/spec.md
  - openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-surface-split-guide.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .codex/hooks.json
  - .codex/hooks/fhd-evidence-reminder.js
tests:
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
-->
