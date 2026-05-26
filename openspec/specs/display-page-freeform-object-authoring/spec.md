# display-page-freeform-object-authoring Specification

## Purpose

TBD - created by archiving change 'add-display-page-freeform-object-editor'. Update Purpose after archive.

## Requirements

### Requirement: Display Pages Editor can add and select page freeform objects
The system SHALL let operators add and select page freeform objects inside Display Pages Editor. The first release SHALL support adding `line`, `asset-image`, and `icon-asset` objects to the current page draft without forcing operators to leave the existing page editor workflow.

#### Scenario: Operator adds a new line object to the current page
- **WHEN** the operator adds a `line` freeform object inside Display Pages Editor
- **THEN** the current page draft gains a new freeform object entry
- **AND** that new object becomes selected in the editor

##### Example: Overview draft receives a new line object
- **GIVEN** the operator is editing Overview in Display Pages Editor
- **WHEN** the operator adds a new `line` object
- **THEN** the Overview draft freeform object list gains one new line entry
- **AND** the object list and canvas overlay both switch to that new object


<!-- @trace
source: add-display-page-freeform-object-editor
updated: 2026-05-26
code:
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/api.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/app.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/display-pages.ts
tests:
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Page freeform object authoring includes list-driven layer, lock, and visibility controls
The system SHALL expose page freeform objects in an object list that supports direct selection, z-order changes, lock toggles, visibility toggles, and deletion. The object list SHALL remain usable even when page objects overlap or are too small to select reliably on the canvas.

#### Scenario: Operator reorders a hidden object from the object list
- **WHEN** the operator changes a page object's z-order and visibility from the object list
- **THEN** the current page preview updates to match that state
- **AND** the selection remains attached to the same object after the reorder

##### Example: Icon asset moves above an image object and is then hidden
- **GIVEN** the current page contains an `asset-image` object and an `icon-asset` object
- **WHEN** the operator moves the icon asset above the image and then hides it
- **THEN** the preview first updates the layer order and then removes the icon asset from view
- **AND** the image object remains in the page draft unchanged


<!-- @trace
source: add-display-page-freeform-object-editor
updated: 2026-05-26
code:
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/api.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/app.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/display-pages.ts
tests:
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Page freeform object authoring uses asset-library-backed pickers for asset objects
The system SHALL let operators choose `asset-image` and `icon-asset` sources through asset-library-backed pickers instead of raw asset id entry. The picker SHALL filter assets to categories and usage scopes valid for page objects.

#### Scenario: Operator picks a page object asset from the asset library
- **WHEN** the operator edits an `asset-image` or `icon-asset` freeform object
- **THEN** the editor shows an asset picker with page-usable assets
- **AND** selecting an asset updates the object's managed asset reference in the current page draft

##### Example: Page object picker excludes shell-only ornament assets
- **GIVEN** the asset library contains one `page-only` image asset and one `shell-only` ornament asset
- **WHEN** the operator opens the picker for an `asset-image` page object
- **THEN** the picker includes the `page-only` image asset
- **AND** the picker excludes the `shell-only` ornament asset


<!-- @trace
source: add-display-page-freeform-object-editor
updated: 2026-05-26
code:
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/api.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/app.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/display-pages.ts
tests:
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Page freeform object authoring supports duplication
The system SHALL let operators duplicate an existing page freeform object so repeated accents or icon objects can be created quickly. The duplicated object SHALL receive a new stable `id` and SHALL remain independently editable from the source object.

#### Scenario: Operator duplicates an existing page object
- **WHEN** the operator duplicates a page freeform object
- **THEN** the current page draft gains a second object with the same editable payload as the source
- **AND** the duplicate has a distinct stable `id`

##### Example: Icon asset duplicate is moved independently
- **GIVEN** the current page draft contains one `icon-asset` object
- **WHEN** the operator duplicates that object
- **THEN** the page draft contains two `icon-asset` objects with different IDs
- **AND** moving the duplicate does not mutate the original object


<!-- @trace
source: add-display-page-freeform-object-editor
updated: 2026-05-26
code:
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/api.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/app.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/display-pages.ts
tests:
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->

---
### Requirement: Page freeform object selections integrate with canvas and inspector editing
The system SHALL reflect the selected page freeform object in the editor canvas and inspector so operators can edit object geometry and source fields without breaking existing seed-backed region editing.

#### Scenario: Selected freeform object opens object-specific inspector fields
- **WHEN** the operator selects a page freeform object from the object list or canvas
- **THEN** the canvas highlights that object
- **AND** the inspector shows fields that match the selected object's type instead of only region fields

##### Example: Asset image object exposes frame and source controls
- **GIVEN** the operator selects an `asset-image` freeform object
- **WHEN** the inspector renders the selected item fields
- **THEN** the inspector shows frame controls and asset source controls for that object
- **AND** existing page regions remain available when the operator changes the selection back

<!-- @trace
source: add-display-page-freeform-object-editor
updated: 2026-05-26
code:
  - packages/shared/src/index.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/services/api.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/app.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/router.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/server/src/routes/display-pages.ts
tests:
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/services/api.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
-->