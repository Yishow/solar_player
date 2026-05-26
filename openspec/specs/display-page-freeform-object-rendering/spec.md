# display-page-freeform-object-rendering Specification

## Purpose

TBD - created by archiving change 'add-display-page-freeform-object-runtime'. Update Purpose after archive.

## Requirements

### Requirement: Store page freeform objects inside each display page draft and live config
The system SHALL store page freeform objects inside each display page configuration envelope so the objects publish together with the rest of that page. Freeform objects SHALL remain separate from the existing region, media, and card-rail groups so operators can add decoration objects without redefining the page's seed-backed content model.

#### Scenario: Publishing a page also publishes its freeform object list
- **WHEN** the operator publishes a display page that contains freeform objects
- **THEN** the page's live config includes the same freeform object list that was reviewed in draft
- **AND** the page does not require a second publish step for those objects

##### Example: Overview draft publishes one line and one asset image object
- **GIVEN** the Overview draft contains one `line` object and one `asset-image` object
- **WHEN** the operator publishes the Overview draft
- **THEN** the Overview live config stores those two objects together with the rest of the page config
- **AND** playback reads the same object list from the live page config


<!-- @trace
source: add-display-page-freeform-object-runtime
updated: 2026-05-26
code:
  - apps/server/src/routes/shell-decorations.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/types.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/app.ts
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/displayPageMediaEffects.ts
tests:
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Display pages render freeform objects in a dedicated content layer
The system SHALL render page freeform objects in a dedicated content-surface layer for playback pages. The first release SHALL support `line`, `asset-image`, and `icon-asset` objects and SHALL render them without rewriting the existing hero, card, or media component ownership.

#### Scenario: Playback renders freeform object types above the page background
- **WHEN** a playback page contains valid freeform objects in its live config
- **THEN** the page renders those objects in the shared content layer
- **AND** the existing page content remains visible beneath or above the objects according to saved z-order

##### Example: Sustainability page renders a line and icon asset object
- **GIVEN** the Sustainability live config contains one `line` object and one `icon-asset` object
- **WHEN** the Sustainability playback route renders
- **THEN** both objects appear inside the page content surface
- **AND** the rest of the Sustainability hero and cards still render normally


<!-- @trace
source: add-display-page-freeform-object-runtime
updated: 2026-05-26
code:
  - apps/server/src/routes/shell-decorations.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/types.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/app.ts
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/displayPageMediaEffects.ts
tests:
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Page freeform object publish validation blocks invalid bounds and sources
The system SHALL validate page freeform objects before publish. Validation SHALL reject objects that leave the FHD content bounds, use unsupported object types, or provide malformed source payloads for asset-backed object types.

#### Scenario: Publish rejects an object outside the content surface
- **WHEN** a page freeform object extends outside the allowed content surface
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending object

##### Example: Asset image object overflows the right edge
- **GIVEN** the page content surface width is `1920`
- **AND** an `asset-image` object stores `left=1820` and `width=180`
- **WHEN** the operator tries to publish the page draft
- **THEN** the publish request is rejected because the object exceeds the content width
- **AND** the validation finding names that object's `id`

#### Scenario: Publish rejects malformed icon asset payloads
- **WHEN** a page freeform object of type `icon-asset` omits the required icon asset reference
- **THEN** the publish request is rejected
- **AND** the validation finding describes the malformed source payload instead of allowing degraded live output

##### Example: Icon object omits its asset reference
- **GIVEN** a page freeform object of type `icon-asset`
- **AND** the object omits the required icon asset identifier
- **WHEN** the operator tries to publish the page draft
- **THEN** the publish request is rejected
- **AND** the validation finding identifies the incomplete icon source payload

<!-- @trace
source: add-display-page-freeform-object-runtime
updated: 2026-05-26
code:
  - apps/server/src/routes/shell-decorations.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/server/src/routes/images.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/types.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayOps.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/app.ts
  - apps/web/src/services/shellDecorations.ts
  - packages/shared/src/displayPageMediaEffects.ts
tests:
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->