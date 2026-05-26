# shared-shell-decoration-authoring Specification

## Purpose

TBD - created by archiving change 'add-shared-shell-decoration-editor'. Update Purpose after archive.

## Requirements

### Requirement: Provide a dedicated authoring surface for shared shell decoration objects
The system SHALL provide a dedicated management authoring surface for shared shell decoration objects so operators can edit the global header and footer decoration config without opening any individual display page editor. The authoring surface SHALL preview the shared shell at FHD geometry and SHALL read and save the shared shell `draft` channel.

#### Scenario: Operator edits shared shell decorations without selecting a display page
- **WHEN** the operator opens the shared shell decoration editor
- **THEN** the editor loads the shared shell decoration draft
- **AND** the editor does not require the operator to choose an individual display page first

##### Example: Header line is edited from the shared shell editor
- **GIVEN** the shared shell draft contains one header line object
- **WHEN** the operator opens the shared shell decoration editor
- **THEN** the line appears in the shell preview and object list
- **AND** the editor does not show a display page selector as the source of truth for that object


<!-- @trace
source: add-shared-shell-decoration-editor
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Shared shell decoration authoring includes object list selection and ordering controls
The system SHALL let operators manage shared shell decoration objects through an object list grouped by `header` and `footer`. The list SHALL support direct selection, deletion, visibility toggles, lock toggles, and z-order controls so small shell objects remain manageable even when the preview is crowded.

#### Scenario: Operator reorders and hides a footer object from the list
- **WHEN** the operator changes a footer object's order or visibility from the object list
- **THEN** the preview updates to match that new list state
- **AND** the selected object remains stable across the reorder action

##### Example: Footer ornament is moved behind a line and hidden
- **GIVEN** the footer object list contains a line object and an ornament image object
- **WHEN** the operator moves the ornament behind the line and toggles it hidden
- **THEN** the preview reflects the new z-order first and then removes the ornament from view
- **AND** the line object remains visible and selected


<!-- @trace
source: add-shared-shell-decoration-editor
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Shared shell decoration authoring edits geometry and asset sources through typed controls
The system SHALL expose typed geometry and source controls for shared shell decoration objects instead of requiring raw payload editing. Line objects SHALL support bounded geometry or style fields needed to position and size shell lines, and asset-backed objects SHALL support picking assets from the managed asset library with a scope compatible with shell usage.

#### Scenario: Operator edits a line object without touching raw JSON
- **WHEN** the operator selects a shell line object
- **THEN** the editor shows typed fields for that line's geometry or style
- **AND** saving those fields updates the shared shell draft without requiring manual payload editing

##### Example: Header line length is increased in the shell editor
- **GIVEN** the shell editor has a selected header line object
- **WHEN** the operator increases that line's width through the geometry controls
- **THEN** the preview updates the line length
- **AND** the shared shell draft stores the updated width for that object

#### Scenario: Operator picks a shell ornament asset from the asset library
- **WHEN** the operator edits an asset-backed shell object
- **THEN** the editor offers an asset picker filtered to assets usable by shell decorations
- **AND** the chosen asset is stored as the object's managed asset reference

##### Example: Footer ornament selects a shell-scoped asset
- **GIVEN** the asset library contains one `shell-only` ornament asset and one `page-only` object asset
- **WHEN** the operator opens the shell object asset picker for a footer ornament
- **THEN** the picker includes the `shell-only` ornament asset
- **AND** the picker excludes the `page-only` object asset


<!-- @trace
source: add-shared-shell-decoration-editor
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Shared shell decoration authoring supports object duplication
The system SHALL let operators duplicate an existing shell decoration object so repeated lines or ornaments can be created quickly. The duplicated object SHALL receive a new stable `id` and SHALL remain independently editable from the source object.

#### Scenario: Operator duplicates a shell line object
- **WHEN** the operator duplicates an existing shell decoration object
- **THEN** the shared shell draft gains a new object with the same editable fields as the source object
- **AND** the duplicate uses a different stable `id`

##### Example: Footer line is duplicated before offsetting it
- **GIVEN** the shared shell draft contains one footer line object
- **WHEN** the operator duplicates that line object
- **THEN** the draft contains two footer line objects with different IDs
- **AND** the operator can move the duplicate without mutating the original line


<!-- @trace
source: add-shared-shell-decoration-editor
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->

---
### Requirement: Shared shell decoration authoring publishes independently from display pages
The system SHALL save and publish shared shell decoration drafts independently from any display page draft or publish workflow. Publishing the shell decoration config SHALL only affect the shared shell live contract and SHALL NOT publish or overwrite display page drafts.

#### Scenario: Publishing shell decorations leaves display page drafts untouched
- **WHEN** the operator publishes a valid shared shell decoration draft
- **THEN** the shared shell `live` config is updated
- **AND** no individual display page draft or live config is changed as a side effect

##### Example: Publishing a header line does not publish an Overview draft
- **GIVEN** the Overview page has unsaved or unpublished draft changes
- **AND** the shared shell draft contains a valid new header line object
- **WHEN** the operator publishes the shared shell decoration draft
- **THEN** the shared shell live config includes the new header line
- **AND** the Overview draft remains in its previous state

<!-- @trace
source: add-shared-shell-decoration-editor
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/services/api.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayOps.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
-->