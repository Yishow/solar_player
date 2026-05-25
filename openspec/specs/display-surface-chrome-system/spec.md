# display-surface-chrome-system Specification

## Purpose

TBD - created by archiving change 'normalize-display-surface-chrome-tokens'. Update Purpose after archive.

## Requirements

### Requirement: Share semantic display chrome tokens across playback pages

The implementation SHALL provide semantic display-surface tokens for common playback-page visual roles so `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability` can share one visual family without duplicating raw page-local color and surface values.

#### Scenario: Playback pages consume display semantic roles

- **WHEN** any of the five playback display pages renders hero typography, card surfaces, photo fades, or ornament colors
- **THEN** those shared visual roles are resolved through semantic display tokens
- **AND** page-local CSS does not introduce new raw color literals for roles already covered by the shared token contract
- **AND** each page keeps its existing FHD geometry and content order

##### Example: Hero title and emphasis use shared display roles

- **GIVEN** a playback page renders a large zh title with an emphasized green or gold word
- **WHEN** the page applies its hero title styles
- **THEN** the title ink and emphasis colors come from display semantic roles
- **AND** the page may still choose whether the emphasis role is green or gold based on its template intent


<!-- @trace
source: normalize-display-surface-chrome-tokens
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/Images/images.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/styles/global.css
  - docs/display-assets/README.md
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Share hero typography rhythm while preserving page placement

The implementation SHALL let playback pages use a shared hero typography rhythm for eyebrow, large title, emphasized title segment, and subtitle while preserving each page's current copy, layout region, and editor-controlled typography config.

#### Scenario: Hero typography remains configurable and visually consistent

- **WHEN** a playback page renders its hero copy region
- **THEN** the eyebrow, title, emphasis, and subtitle use the shared display hero rhythm by default
- **AND** existing `chrome.heroTypography` config values remain valid editor-controlled overrides
- **AND** the page does not move the hero copy region to adopt the shared rhythm


<!-- @trace
source: normalize-display-surface-chrome-tokens
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/Images/images.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/styles/global.css
  - docs/display-assets/README.md
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Share photo fade and ornament vocabulary

The implementation SHALL provide shared photo fade and ornament treatments for display playback pages so hero images, gallery images, leaf watermarks, and gold lines visually blend into the same warm paper display surface.

#### Scenario: Media and ornaments align across pages

- **WHEN** playback pages render hero media, gallery media, leaf ornaments, or gold lines
- **THEN** photo fades and ornaments use the shared display chrome vocabulary
- **AND** page-specific position, opacity, scale, and direction remain configurable where already supported
- **AND** missing or disabled media/ornaments do not make the page unreadable

##### Example: Hero image fades into paper without hard edges

- **GIVEN** a playback page has a managed or seed-default hero image
- **WHEN** the image renders inside the display surface
- **THEN** the image fades into the warm paper background using shared fade semantics
- **AND** the page keeps its existing media container geometry

<!-- @trace
source: normalize-display-surface-chrome-tokens
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/Solar/solar.css
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .agents/skills/display-asset-generation/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - docs/display-assets/prompt-recipes/display-pages.md
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .codex/hooks.json
  - AGENTS.md
  - apps/web/src/pages/Images/images.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - apps/web/src/styles/global.css
  - docs/display-assets/README.md
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
tests:
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->