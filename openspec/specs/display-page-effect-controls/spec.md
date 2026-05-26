# display-page-effect-controls Specification

## Purpose

TBD - created by archiving change 'add-display-page-effect-controls'. Update Purpose after archive.

## Requirements

### Requirement: Supported hero and media surfaces store bounded display effect settings
The system SHALL let supported hero and media surfaces store bounded display effect settings instead of relying only on raw page-local CSS. The first release SHALL support effect groups needed for the current visual regressions, including edge fade, blur, and overlay-style adjustments where those surfaces support them.

#### Scenario: Operator saves a bounded effect adjustment for a supported surface
- **WHEN** the operator changes effect settings for a supported hero or media surface
- **THEN** the page draft stores those effect settings in structured form
- **AND** the saved values remain within the allowed bounds for that effect group

##### Example: Overview hero stores a left-edge fade and blur setting
- **GIVEN** the Overview hero surface supports edge fade and blur controls
- **WHEN** the operator reduces the left-edge fade width and increases the blur amount within allowed bounds
- **THEN** the Overview draft stores those effect settings in the hero effect group
- **AND** the values remain inside the configured min and max ranges


<!-- @trace
source: add-display-page-effect-controls
updated: 2026-05-26
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/managementDraftSave.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->

---
### Requirement: Editor preview and playback runtime resolve the same display effect settings
The system SHALL resolve supported display effect settings through the same effect resolver for editor preview and playback runtime. Effect-backed surfaces SHALL remain visually consistent across authoring and production routes.

#### Scenario: Preview and playback show the same hero effect result
- **WHEN** a page draft or live config contains supported effect settings
- **THEN** the editor preview and playback runtime apply the same visual effect interpretation
- **AND** the surface does not require page-local duplicate logic to keep them aligned

##### Example: Overview preview and playback keep the same left-edge fade behavior
- **GIVEN** the Overview hero effect group contains a left-edge fade and blur configuration
- **WHEN** the operator views the page in editor preview and then opens the playback route
- **THEN** both surfaces show the same left-edge fade and blur treatment
- **AND** neither surface falls back to a separate hardcoded CSS-only variant


<!-- @trace
source: add-display-page-effect-controls
updated: 2026-05-26
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/managementDraftSave.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->

---
### Requirement: Effect settings fall back safely when values or surfaces are unsupported
The system SHALL fall back safely when effect settings are invalid, out of range, or applied to unsupported surfaces. Invalid effect data SHALL NOT make the hero or media surface disappear.

#### Scenario: Unsupported or invalid effect payload uses safe defaults
- **WHEN** a saved effect payload contains unsupported values or targets a surface that does not support that effect group
- **THEN** the resolver falls back to safe defaults for that surface
- **AND** the media still renders visibly

##### Example: Blur value exceeds the supported maximum
- **GIVEN** a hero effect group stores a blur amount above the supported maximum
- **WHEN** the resolver applies that effect group
- **THEN** the blur value is clamped or reset to a safe default
- **AND** the hero media still renders instead of disappearing

<!-- @trace
source: add-display-page-effect-controls
updated: 2026-05-26
code:
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/Images/images.css
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - packages/shared/src/index.ts
  - apps/web/src/services/api.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - packages/shared/src/displayOps.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/shellDecorationService.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/routes/images.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - packages/shared/src/managementDraftSave.ts
  - packages/shared/src/types.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
-->