# display-asset-library-management Specification

## Purpose

TBD - created by archiving change 'add-display-asset-library-management'. Update Purpose after archive.

## Requirements

### Requirement: Asset library management organizes display assets by category and usage scope
The system SHALL provide a dedicated display asset library management surface that organizes managed assets by category and usage scope. The first release SHALL support `background`, `object`, and `icon` categories and SHALL let operators filter the catalog by at least `shell-only`, `page-only`, or `both` usage scope.

#### Scenario: Operator switches between category tabs
- **WHEN** the operator opens the asset library management surface and changes category tabs
- **THEN** the asset list updates to show only assets from the selected category
- **AND** the current usage-scope filters remain understandable to the operator

##### Example: Object tab shows only object-category assets
- **GIVEN** the catalog contains background, object, and icon assets
- **WHEN** the operator selects the `object` tab
- **THEN** the list shows only object-category assets
- **AND** each row still indicates whether the asset is usable for shell, page, or both


<!-- @trace
source: add-display-asset-library-management
updated: 2026-05-26
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/routes/images.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useShellDecorations.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->

---
### Requirement: Asset library management assigns category and usage scope during upload
The system SHALL assign category and usage scope metadata during asset upload or import so new assets enter the catalog with usable picker metadata from the start. Uploads SHALL NOT silently create catalog entries without category or usage-scope information.

#### Scenario: Operator uploads a new object asset with explicit metadata
- **WHEN** the operator uploads a new asset through the asset library management surface
- **THEN** the upload flow asks for or applies category and usage-scope metadata
- **AND** the completed asset appears in the catalog under the expected category tab

##### Example: SVG ornament uploads into the object category
- **GIVEN** the operator uploads an SVG ornament intended for page decorations
- **WHEN** the operator marks it as category `object` with usage scope `page-only`
- **THEN** the uploaded asset appears in the `object` tab
- **AND** page-object pickers can use it without waiting for a second metadata-edit step


<!-- @trace
source: add-display-asset-library-management
updated: 2026-05-26
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/routes/images.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useShellDecorations.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->

---
### Requirement: Asset library management reports cross-surface usage before destructive actions
The system SHALL report where a managed asset is used across display page media, shared shell decorations, and page freeform objects before destructive actions are allowed. When an asset is still referenced, the management surface SHALL block silent deletion and SHALL show the referencing locations.

#### Scenario: Operator tries to delete an asset that is still referenced
- **WHEN** the operator requests deletion for a managed asset that is still referenced by shell or page config
- **THEN** the delete action is blocked
- **AND** the management surface shows the referencing shell or page locations

##### Example: Shell ornament asset is still used in the footer
- **GIVEN** an ornament asset is referenced by one shared footer decoration object
- **WHEN** the operator attempts to delete that asset from the asset library
- **THEN** the delete action is blocked
- **AND** the usage report identifies the shared footer decoration reference

<!-- @trace
source: add-display-asset-library-management
updated: 2026-05-26
code:
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/server/src/routes/images.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/hooks/useShellDecorations.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->