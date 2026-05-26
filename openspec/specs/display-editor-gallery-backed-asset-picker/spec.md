# display-editor-gallery-backed-asset-picker Specification

## Purpose

TBD - created by archiving change 'upgrade-display-editor-asset-picker-experience'. Update Purpose after archive.

## Requirements

### Requirement: Editor asset pickers provide gallery-backed visual selection

The system SHALL provide gallery-backed asset pickers for Display Pages Editor page objects and Shared Shell Decorations. Asset pickers SHALL show eligible assets with thumbnails, labels, category, usage scope, and selected state instead of relying only on text-only select controls.

#### Scenario: Operator chooses an image asset for a page object

- **WHEN** the operator opens the asset picker for a page freeform image object
- **THEN** the picker shows eligible managed assets as visual cards
- **AND** each card includes a thumbnail and asset metadata
- **AND** choosing a card updates the page object managed asset reference

##### Example: Shell-only asset is hidden from page picker

- **GIVEN** the asset catalog contains one `shell-only` ornament image
- **WHEN** the operator opens a page object asset picker
- **THEN** that shell-only asset is not offered as a selectable page object source


<!-- @trace
source: upgrade-display-editor-asset-picker-experience
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/styles/tokens.css
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->

---
### Requirement: Editor asset pickers preserve editing context when opening the asset workspace

The system SHALL let operators open the integrated asset library workspace from an editor asset picker without losing the original page, shell object, or selected inspector context.

#### Scenario: Operator needs to upload an asset while choosing a shell ornament

- **WHEN** the operator opens the asset workspace from a shell decoration asset picker
- **THEN** the editor navigates within `/display-pages/editor`
- **AND** the original shell decoration selection can be restored when the operator returns

<!-- @trace
source: upgrade-display-editor-asset-picker-experience
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/imagesSupport.ts
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/styles/tokens.css
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
-->