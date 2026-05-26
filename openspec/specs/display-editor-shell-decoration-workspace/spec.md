# display-editor-shell-decoration-workspace Specification

## Purpose

TBD - created by archiving change 'integrate-shell-decoration-workspace-into-display-editor'. Update Purpose after archive.

## Requirements

### Requirement: Expose Shared Shell Decorations authoring inside Display Pages Editor

The system SHALL expose Shared Shell Decorations authoring as an integrated workspace within `/display-pages/editor`. Operators SHALL be able to edit header and footer shell decoration objects without navigating to a separate canonical full-page shell editor route.

#### Scenario: Operator opens shell decorations from the editor

- **WHEN** the operator opens `/display-pages/editor` and switches to the shell decorations workspace
- **THEN** the editor shows the shared shell decoration canvas, object list, and inspector inside the same route
- **AND** the workspace uses the full shell preview including header and footer areas

##### Example: Header ornament editing stays in the editor route

- **GIVEN** the operator needs to adjust a header ornament
- **WHEN** they open the shell decorations workspace
- **THEN** the browser remains on `/display-pages/editor`
- **AND** the operator can select and edit the header ornament in the integrated shell preview


<!-- @trace
source: integrate-shell-decoration-workspace-into-display-editor
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
tests:
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
-->

---
### Requirement: Preserve separate shell draft and publish lifecycle

The integrated shell workspace SHALL preserve the shared shell decoration draft/live lifecycle. Shell save and publish actions SHALL use shell decoration APIs, and page save or publish actions SHALL NOT publish shell decoration drafts.

#### Scenario: Operator publishes shell decorations from the integrated workspace

- **WHEN** the operator changes a shell decoration object and clicks publish in the shell workspace
- **THEN** the shell decoration live config is updated through the shell publish flow
- **AND** the current display page draft is not published by that action

##### Example: Page draft remains pending after shell publish

- **GIVEN** the Overview page has unsaved page draft changes
- **AND** the shell workspace has a modified footer line
- **WHEN** the operator publishes the shell workspace
- **THEN** the footer line becomes live
- **AND** the Overview page draft remains unpublished

<!-- @trace
source: integrate-shell-decoration-workspace-into-display-editor
updated: 2026-05-26
code:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
tests:
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
-->