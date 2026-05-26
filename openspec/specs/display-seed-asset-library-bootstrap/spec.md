# display-seed-asset-library-bootstrap Specification

## Purpose

TBD - created by archiving change 'bootstrap-display-seed-assets-into-asset-library'. Update Purpose after archive.

## Requirements

### Requirement: Current display seed visuals are bootstrapped into managed asset library

The system SHALL bootstrap current display seed visual assets into the managed asset library so existing backgrounds, main-stage images, card icons, flow or node icons, thumbnails, and ornament fallback visuals are visible as catalog items without requiring manual upload.

#### Scenario: Operator opens Asset Library after database seed

- **WHEN** the system database has been migrated and seeded
- **THEN** Asset Library includes managed asset rows for the current display seed visuals
- **AND** those assets have category, usage scope, title, and resolvable upload filenames
- **AND** the assets can be selected by editor asset pickers

##### Example: Existing Overview background appears in gallery

- **GIVEN** Overview uses a seed hero background image
- **WHEN** the operator opens the asset library workspace
- **THEN** the Overview hero seed image appears as a background asset
- **AND** its file resolves through the same managed asset URL pattern as uploaded assets


<!-- @trace
source: bootstrap-display-seed-assets-into-asset-library
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
tests:
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Seed asset bootstrap is idempotent and non-destructive

The system SHALL bootstrap seed assets idempotently. Repeated seed or startup runs SHALL NOT duplicate seed asset rows and SHALL NOT overwrite operator-uploaded assets or operator replacement choices.

#### Scenario: Bootstrap runs more than once

- **WHEN** seed asset bootstrap runs after the same seed assets already exist
- **THEN** the existing seed asset catalog rows are reused
- **AND** no duplicate rows are inserted
- **AND** user-uploaded assets remain unchanged

##### Example: Solar icon seed remains one catalog item

- **GIVEN** the Solar generation icon seed asset already exists in the managed asset catalog
- **WHEN** the server seed runs again
- **THEN** there is still only one catalog row for that Solar generation icon seed
- **AND** any separately uploaded replacement icon remains present

<!-- @trace
source: bootstrap-display-seed-assets-into-asset-library
updated: 2026-05-26
code:
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
tests:
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->