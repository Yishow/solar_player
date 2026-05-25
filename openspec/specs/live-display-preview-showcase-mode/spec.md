# live-display-preview-showcase-mode Specification

## Purpose

TBD - created by archiving change 'split-live-display-preview-showcase-mode'. Update Purpose after archive.

## Requirements

### Requirement: Support editor and showcase presentation modes for live display previews

The implementation SHALL support distinct presentation modes for `LiveDisplayPagePreview` so editor contexts can keep diagnostic chrome while slideshow showcase contexts can render cleaner display miniatures.

#### Scenario: Existing callers keep editor behavior by default

- **WHEN** a caller renders `LiveDisplayPagePreview` without specifying a presentation mode
- **THEN** the preview uses editor presentation behavior
- **AND** read-only indication, detailed fallback text, border treatment, and diagnostic affordances remain available

#### Scenario: Showcase callers render a cleaner miniature

- **WHEN** a caller renders `LiveDisplayPagePreview` in showcase mode
- **THEN** the preview minimizes or removes read-only badge chrome
- **AND** it uses display-friendly surface and fallback styling
- **AND** it still renders the live page renderer when the state is ready


<!-- @trace
source: split-live-display-preview-showcase-mode
updated: 2026-05-26
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Solar/solar.css
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/display-surface-visual-review-checklist.md
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/asset-manifest.template.md
  - docs/display-assets/README.md
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
-->

---
### Requirement: Slideshow preview cards use showcase mode

The implementation SHALL render `SlideshowPreview` carousel cards with showcase-mode live previews so the cards read as display-page miniatures rather than nested editor widgets.

#### Scenario: Carousel card avoids management chrome

- **WHEN** `/slideshow-preview` renders live preview cards
- **THEN** each card requests showcase mode for its embedded live display page preview
- **AND** the carousel card frame remains responsible for card selection, active glow, numbering, and footer label
- **AND** the embedded page preview does not add a competing management-style badge or heavy frame


<!-- @trace
source: split-live-display-preview-showcase-mode
updated: 2026-05-26
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Solar/solar.css
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/display-surface-visual-review-checklist.md
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/asset-manifest.template.md
  - docs/display-assets/README.md
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
-->

---
### Requirement: Fallback states remain safe in both modes

The implementation SHALL keep non-ready live preview states readable and layout-safe in both editor and showcase presentation modes.

#### Scenario: Showcase fallback stays concise and stable

- **WHEN** a showcase preview receives `loading`, `unpublished`, `config-unavailable`, `runtime-unavailable`, `asset-unavailable`, or `renderer-unavailable`
- **THEN** it renders a concise display-friendly fallback surface
- **AND** the carousel card does not collapse or change dimensions
- **AND** detailed diagnostic text remains available in editor mode

<!-- @trace
source: split-live-display-preview-showcase-mode
updated: 2026-05-26
code:
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Solar/solar.css
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - docs/display-surface-visual-review-checklist.md
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/images.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/asset-manifest.template.md
  - docs/display-assets/README.md
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
-->