# factory-circuit-display-primitive-alignment Specification

## Purpose

TBD - created by archiving change 'align-factory-circuit-display-primitives'. Update Purpose after archive.

## Requirements

### Requirement: Align Factory KPI cards with the shared metric-card family

The implementation SHALL render `FactoryCircuit` KPI cards through the shared display metric-card family or an equivalent wrapper so their frame, header, icon, value row, unit baseline, and footer rhythm align with the rest of the playback display pages.

#### Scenario: Factory KPI cards adopt shared metric rhythm

- **WHEN** `/factory-circuit` renders KPI cards
- **THEN** each KPI card uses the shared metric-card frame/header/value/footer rhythm
- **AND** each card keeps its current FHD `left`, `top`, `width`, and `height`
- **AND** each card keeps its current data binding and semantic label
- **AND** compact Factory-specific value sizing is handled through CSS variables or slots rather than page-local absolute positioning


<!-- @trace
source: align-factory-circuit-display-primitives
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-assets/README.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .codex/hooks.json
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/overview.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
tests:
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Share a display node vocabulary for circuit nodes

The implementation SHALL align Factory circuit nodes to a shared display node vocabulary for surface, border, shadow, icon, label, subtitle, value, and optional status treatment while preserving the circuit topology.

#### Scenario: Circuit node styling aligns without topology drift

- **WHEN** Factory circuit nodes render solar source, inverter, board, or load-related nodes
- **THEN** their visual surface and icon/label rhythm follow the shared display node vocabulary
- **AND** their current position, size, topology, and semantic role remain unchanged
- **AND** missing icon assets degrade to readable text within the same node geometry

##### Example: Inverter node adopts shared node surface without moving

- **GIVEN** the inverter node already renders at its current `left`, `top`, `width`, and `height`
- **WHEN** the node is migrated to the shared display node vocabulary
- **THEN** its surface, icon, zh/en labels, and optional value follow shared display node roles
- **AND** its geometry and role in the circuit topology stay unchanged
- **AND** if the icon source is missing, the same node frame still renders readable text content


<!-- @trace
source: align-factory-circuit-display-primitives
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-assets/README.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .codex/hooks.json
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/overview.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
tests:
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Refine Factory routing treatment without changing status semantics

The implementation SHALL let Factory routing lines use shared display-family stroke and accent tokens while preserving the current routing topology, slot binding, and alert/status semantics.

#### Scenario: Routing polish preserves electrical meaning

- **WHEN** routing lines, connector segments, dashed paths, or endpoint markers render
- **THEN** they use tokenized primary, neutral, and accent/warning display colors
- **AND** they remain visually distinguishable for normal, warning, danger, and neutral states
- **AND** the line topology and status mapping do not change

##### Example: Warning connector keeps warning meaning after tokenization

- **GIVEN** a warning-state connector segment is currently mapped to an accent/warning treatment
- **WHEN** routing strokes are moved onto shared display-family tokens
- **THEN** the connector still reads as warning from display distance
- **AND** its start/end points and segment path stay unchanged
- **AND** neutral and danger routes remain visually distinguishable from the warning route


<!-- @trace
source: align-factory-circuit-display-primitives
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-assets/README.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .codex/hooks.json
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/overview.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
tests:
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Align load rows through surface tokens without turning them into KPI cards

The implementation SHALL keep Factory load rows as compact status rows while aligning their surface, icon, text, and status colors with the shared display family.

#### Scenario: Load rows remain compact and status-aware

- **WHEN** Factory load rows render load labels, status labels, and runtime values
- **THEN** they keep their current compact row structure and information density
- **AND** their surface, border, icon, and status colors use display-family tokens
- **AND** they are not forced into the metric-card primitive

##### Example: Compact load row keeps alert semantics outside the KPI primitive

- **GIVEN** a load row already renders zh label, en subtitle, status tone, and runtime percentage in one compact row
- **WHEN** the row adopts shared display-family surface and status tokens
- **THEN** the row keeps the same compact density and label/value ordering
- **AND** warning and danger tones still map to their existing alert semantics
- **AND** the row does not become a metric-card frame

<!-- @trace
source: align-factory-circuit-display-primitives
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - .agents/skills/display-asset-generation/SKILL.md
  - docs/display-assets/README.md
  - apps/web/src/components/PageContainer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displaySurfaceNodes.css
  - .agents/skills/display-asset-generation/README.md
  - apps/web/src/pages/Sustainability/sustainability.css
  - docs/display-assets/prompt-recipes/shared-style.md
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/solar.css
  - AGENTS.md
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/publishingStatus.tsx
  - apps/web/src/styles/global.css
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - docs/display-assets/asset-manifest.template.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorTools.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/components/TitleBlock.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - .codex/hooks.json
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Overview/overview.css
  - docs/display-surface-visual-review-checklist.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - docs/display-assets/prompt-recipes/display-pages.md
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/SlideshowPreview/preview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
tests:
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/pages/FactoryCircuit/nodeVocabulary.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/styles/tokens.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->