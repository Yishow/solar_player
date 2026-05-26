# display-editor-managed-visual-replacement Specification

## Purpose

TBD - created by archiving change 'extend-managed-asset-replacement-to-visual-primitives'. Update Purpose after archive.

## Requirements

### Requirement: Display editor can replace existing visual primitives with managed assets

The system SHALL let operators replace existing display visual primitives with managed assets from the asset library. Replacement coverage SHALL include page backgrounds or hero media, main-stage images, card icons, flow or node icons, placeholder icons, and replaceable leaf or ornament visuals.

#### Scenario: Operator replaces a card icon from the asset library

- **WHEN** the operator selects a card icon region in Display Pages Editor
- **THEN** the inspector provides a managed asset replacement option
- **AND** choosing an asset updates the draft config for that icon source
- **AND** the preview renders the selected asset instead of the built-in icon fallback

##### Example: Solar KPI icon is replaced

- **GIVEN** the Solar generation KPI card uses the seed sun/generation icon
- **WHEN** the operator chooses a managed icon asset for that KPI card
- **THEN** the Solar editor preview renders the managed icon asset
- **AND** publishing the page makes the replacement visible on the Solar playback route


<!-- @trace
source: extend-managed-asset-replacement-to-visual-primitives
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/styles/tokens.css
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Managed visual replacements participate in asset governance

The system SHALL include managed visual replacements in asset health checks, usage reporting, and destructive delete guards. A managed asset referenced by a page icon, node icon, ornament, or shell ornament SHALL NOT be silently deleted.

#### Scenario: Operator tries to delete an asset used by a leaf ornament

- **WHEN** an asset is referenced by a display page leaf ornament replacement
- **AND** the operator attempts to delete that asset from the asset library
- **THEN** the delete action is blocked
- **AND** the usage panel identifies the page and ornament binding that depends on the asset

##### Example: Shell ornament replacement blocks deletion

- **GIVEN** a Shared Shell Decoration ornament uses managed asset `42`
- **WHEN** the operator selects asset `42` in the asset library
- **THEN** the usage panel lists the shell ornament binding
- **AND** deleting asset `42` is blocked until the shell ornament no longer references it


<!-- @trace
source: extend-managed-asset-replacement-to-visual-primitives
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/styles/tokens.css
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->

---
### Requirement: Managed visual replacements fall back safely

The system SHALL fall back to the configured seed source, glyph, registry icon, or built-in ornament when a managed visual replacement cannot resolve. The fallback SHALL preserve page readability and SHALL surface an asset health finding for the unresolved managed reference.

#### Scenario: Managed card icon asset is missing

- **WHEN** a page card icon references a managed asset that no longer exists
- **THEN** the page renders the seed icon fallback
- **AND** asset health reports the missing managed icon reference

##### Example: Factory node icon remains readable

- **GIVEN** a Factory node icon references a deleted managed asset
- **WHEN** the Factory Circuit page renders
- **THEN** the node uses its seed registry icon fallback
- **AND** the asset health panel reports the deleted managed asset reference

<!-- @trace
source: extend-managed-asset-replacement-to-visual-primitives
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/styles/tokens.css
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
-->