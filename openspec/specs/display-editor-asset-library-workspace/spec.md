# display-editor-asset-library-workspace Specification

## Purpose

TBD - created by archiving change 'integrate-asset-library-workspace-into-display-editor'. Update Purpose after archive.

## Requirements

### Requirement: Expose asset library management inside Display Pages Editor

The system SHALL expose Asset Library management as an integrated workspace within `/display-pages/editor`. Operators SHALL be able to browse, upload, inspect, and select managed display assets without leaving the Display Pages Editor route.

#### Scenario: Operator opens the asset workspace from the editor

- **WHEN** the operator opens `/display-pages/editor` and switches to the asset library workspace
- **THEN** the editor shows the managed asset gallery inside the same route
- **AND** the page authoring context remains recoverable without navigating to a separate full-page settings surface

##### Example: Background replacement keeps editor context

- **GIVEN** the operator is editing the Overview page background
- **WHEN** they open the asset library workspace to choose a replacement image
- **THEN** the gallery opens inside `/display-pages/editor`
- **AND** returning from the gallery preserves the Overview editing context


<!-- @trace
source: integrate-asset-library-workspace-into-display-editor
updated: 2026-05-26
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/types.ts
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Provide editor-grade gallery controls and usage visibility

The integrated asset workspace SHALL provide category filtering, search, upload entry, thumbnail browsing, asset preview, reference counts, usage locations, and delete guard messaging. Assets that are still referenced by page or shell configuration SHALL NOT be deletable without an explicit blocked-state explanation.

#### Scenario: Operator inspects an asset used by display pages

- **WHEN** the operator selects an asset in the integrated gallery
- **THEN** the workspace shows where that asset is used
- **AND** the delete action is disabled or blocked when active references exist
- **AND** the blocked state explains the dependent page or shell usages

##### Example: Shell ornament asset cannot be silently deleted

- **GIVEN** an ornament image is used by Shared Shell Decorations
- **WHEN** the operator selects that image in the editor asset workspace
- **THEN** the usage panel lists the shell decoration reference
- **AND** the delete action is blocked with an explanation

<!-- @trace
source: integrate-asset-library-workspace-into-display-editor
updated: 2026-05-26
code:
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/types.ts
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->