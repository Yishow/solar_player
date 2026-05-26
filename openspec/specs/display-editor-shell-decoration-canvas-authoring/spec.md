# display-editor-shell-decoration-canvas-authoring Specification

## Purpose

TBD - created by archiving change 'improve-shell-decoration-canvas-authoring'. Update Purpose after archive.

## Requirements

### Requirement: Shell decoration canvas supports direct object selection and manipulation

The system SHALL let operators select, drag, and resize Shared Shell Decoration objects directly on the shell authoring canvas. Canvas manipulation SHALL update the selected object's shell decoration draft frame without requiring raw JSON edits.

#### Scenario: Operator drags a header ornament on the canvas

- **WHEN** the operator selects a header-mounted shell decoration object on the canvas and drags it
- **THEN** the object's draft frame updates in header-local coordinates
- **AND** the object list and inspector show the same selected object
- **AND** the object remains constrained to the header band

##### Example: Header line stays inside header bounds

- **GIVEN** a header line object is selected
- **WHEN** the operator drags it below the header band
- **THEN** the saved draft frame is clamped within the header band
- **AND** the canvas preview shows the clamped position


<!-- @trace
source: improve-shell-decoration-canvas-authoring
updated: 2026-05-26
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/app/router.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
-->

---
### Requirement: Shell decoration canvas exposes band guides and live measurements

The system SHALL render header/footer band guides and live selected-object measurements in the shell decoration canvas. These guides SHALL use the same design-space coordinate mapping as the display editor preview and SHALL remain passive to shell object interactions.

#### Scenario: Operator resizes a footer decoration

- **WHEN** the operator resizes a footer-mounted shell decoration object
- **THEN** the canvas shows the object's width, height, and distances to footer band bounds
- **AND** header/footer boundary guides remain visible
- **AND** the guide layer does not block pointer interaction

##### Example: Footer ornament reports distances to footer band

- **GIVEN** a footer ornament object is selected at `left=120`, `top=12`, `width=80`, and `height=32`
- **WHEN** the operator resizes its width to `140`
- **THEN** the measurement overlay reports `140` as the object width
- **AND** left, right, top, and bottom distances are measured against the footer band bounds

<!-- @trace
source: improve-shell-decoration-canvas-authoring
updated: 2026-05-26
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/app/router.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
-->