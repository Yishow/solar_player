# display-editor-extension-localization Specification

## Purpose

TBD - created by archiving change 'complete-display-editor-extension-localization'. Update Purpose after archive.

## Requirements

### Requirement: Display editor extension surfaces use Traditional Chinese primary labels

The system SHALL render primary operation labels, field labels, status text, and empty states in Traditional Chinese for Display Pages Editor extension surfaces, including media effect controls, page freeform object controls, asset picker controls, and Shared Shell Decorations authoring controls.

#### Scenario: Operator edits media effects

- **WHEN** the operator opens effect controls for a supported hero or media surface
- **THEN** the effect field labels and options are shown in Traditional Chinese
- **AND** English is not required to understand the operation

##### Example: Blur and edge fade labels are localized

- **GIVEN** the Overview hero media effect controls are visible
- **WHEN** the inspector renders those controls
- **THEN** blur, edge fade, bottom fade, opacity, direction, width, height, and amount labels are shown as Traditional Chinese operation labels


<!-- @trace
source: complete-display-editor-extension-localization
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
-->

---
### Requirement: Shell decoration authoring labels are localized without changing technical identifiers

The system SHALL localize visible Shared Shell Decorations authoring labels while preserving route paths, object IDs, config keys, API payload keys, and other technical identifiers.

#### Scenario: Operator edits a shell object

- **WHEN** the operator selects a shell decoration object
- **THEN** mount, type, geometry, style, asset, save, and publish controls use Traditional Chinese labels
- **AND** object IDs and version numbers remain visible as technical identifiers when needed

##### Example: Shell line controls are localized while ID remains literal

- **GIVEN** a shell line object with id `header-line-1` is selected
- **WHEN** the shell decoration inspector renders
- **THEN** controls for header/footer mount, line type, left, top, width, height, z-index, opacity, thickness, and color use Traditional Chinese labels
- **AND** `header-line-1` remains visible as the technical object identifier

<!-- @trace
source: complete-display-editor-extension-localization
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
-->