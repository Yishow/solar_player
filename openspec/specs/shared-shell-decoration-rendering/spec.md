# shared-shell-decoration-rendering Specification

## Purpose

TBD - created by archiving change 'render-shared-shell-decorations'. Update Purpose after archive.

## Requirements

### Requirement: Render shared shell decoration objects inside playback and management shell bands
The system SHALL render shared shell decoration objects inside the existing header and footer bands for both playback and management shells. The rendering path SHALL use the published live shell decoration contract so both shell families present the same shared objects at the same FHD coordinates.

#### Scenario: Playback and management shells render the same live header objects
- **WHEN** both shell families read the same live shell decoration contract
- **THEN** they render the same header object set inside the shared header band
- **AND** the object coordinates map to the same design-space positions in both shells

##### Example: One header line appears in the same position in both shells
- **GIVEN** the live shell decoration contract contains a `header` line object at `left=86`, `top=76`, `width=642`, `height=2`
- **WHEN** the playback shell and management shell render their headers
- **THEN** both shells show that line inside the header band
- **AND** the rendered line aligns to the same FHD position in each shell


<!-- @trace
source: render-shared-shell-decorations
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/displayOps.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/services/shellDecorationService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - packages/shared/src/index.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/shellFoundation.test.ts
-->

---
### Requirement: Shell decoration layers preserve deterministic order without blocking shell interactions
The system SHALL render shell decoration objects in deterministic order and SHALL keep the decoration layers passive so existing shell interactions remain available. Decorative objects SHALL appear above or below visual shell content according to saved z-order, but they SHALL NOT take over pointer interactions that belong to brand, status, weather, or navigation elements.

#### Scenario: Decorations render in saved order while navigation remains clickable
- **WHEN** the shell renders multiple footer decoration objects together with the footer navigation
- **THEN** the objects follow their saved z-order
- **AND** the footer navigation remains interactive

##### Example: Footer ornament sits behind links while a highlight line sits above the background
- **GIVEN** the live footer object list contains a low-z ornament image and a higher-z line object
- **WHEN** the footer renders those objects with the navigation links
- **THEN** the ornament appears behind the links and the line appears above the footer background
- **AND** the links still respond to pointer interaction


<!-- @trace
source: render-shared-shell-decorations
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/displayOps.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/services/shellDecorationService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - packages/shared/src/index.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/shellFoundation.test.ts
-->

---
### Requirement: Shell decoration rendering falls back cleanly when live data or assets are unavailable
The system SHALL keep the existing shell chrome visible when the live shell decoration contract is empty, unavailable, or partially unresolved. A missing object asset SHALL only affect that object and SHALL NOT cause the whole header or footer render path to fail.

#### Scenario: Missing asset skips one object without breaking the shell
- **WHEN** a live shell decoration object references an asset that cannot be resolved
- **THEN** the runtime skips that object
- **AND** the rest of the shell chrome and remaining decoration objects continue rendering

##### Example: Missing footer ornament does not remove the footer navigation
- **GIVEN** the live footer object list contains one missing ornament image and one valid line object
- **WHEN** the footer renders
- **THEN** the missing ornament is omitted
- **AND** the line object and footer navigation still render normally


<!-- @trace
source: render-shared-shell-decorations
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/displayOps.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/services/shellDecorationService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - packages/shared/src/index.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/shellFoundation.test.ts
-->

---
### Requirement: Shared shell decoration publishes refresh active shell runtimes
The system SHALL refresh active playback and management shells after a shared shell decoration publish updates the live shell config. Active shells SHALL re-read the live shell decoration contract without requiring a manual full-page reload.

#### Scenario: Active playback shell refreshes after shell publish
- **WHEN** an operator publishes a valid shared shell decoration draft
- **THEN** active playback shells reload the live shell decoration payload
- **AND** the newly published header or footer objects appear without a manual browser refresh

##### Example: New footer line appears after publish
- **GIVEN** a playback shell is already open on `/overview`
- **AND** the operator publishes a shared footer line object from the shell editor
- **WHEN** the publish completes
- **THEN** the open playback shell refreshes its footer decoration layer
- **AND** the new footer line appears without reloading the whole route manually

<!-- @trace
source: render-shared-shell-decorations
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/displayOps.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/Images/images.css
  - apps/server/src/services/shellDecorationService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/app/routeMeta.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - packages/shared/src/index.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - packages/shared/src/managementDraftSave.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
tests:
  - apps/server/src/routes/images.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/shellFoundation.test.ts
-->