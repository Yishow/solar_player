# display-page-effect-visual-fidelity Specification

## Purpose

TBD - created by archiving change 'refine-display-page-effect-visuals'. Update Purpose after archive.

## Requirements

### Requirement: Render visible localized mist effects consistently

The system SHALL render localized mist or edge blur effects as visible media-layer treatments in both Display Pages Editor previews and playback runtime surfaces. Mist rendering SHALL preserve the primary media subject while softening the configured edge or region, and SHALL NOT rely only on blurring the entire image.

#### Scenario: Operator previews a page with mist enabled

- **WHEN** a display page media item has mist or edge blur enabled
- **THEN** the editor preview renders a visible localized mist treatment on the configured edge or region
- **AND** the rest of the media remains visible enough for placement editing
- **AND** the playback runtime uses the same rendering semantics

##### Example: Overview hero image shows left-edge mist

- **GIVEN** the Overview hero media uses the default visible mist treatment
- **WHEN** the operator opens `/display-pages/editor?page=overview`
- **THEN** the hero image shows a soft mist transition along the configured edge
- **AND** the effect is also visible on the live Overview playback route


<!-- @trace
source: refine-display-page-effect-visuals
updated: 2026-05-26
code:
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/shellDecorations.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/db/seed.ts
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
-->

---
### Requirement: Keep media effects bounded to their owning media layer

The system SHALL keep mist, blur, opacity, and edge fade effects bounded to the media layer that owns the configured effect. These effects SHALL NOT obscure shell header/footer chrome or unrelated display page content.

#### Scenario: Media effect is enabled near shell chrome

- **WHEN** a media item with mist or blur appears near the header or footer
- **THEN** the effect remains clipped to the media effect container
- **AND** shell chrome remains readable and interactive

##### Example: Footer navigation remains readable

- **GIVEN** a page background image uses bottom-edge mist
- **WHEN** the playback shell renders the footer navigation
- **THEN** the footer labels remain readable
- **AND** the mist does not create a new overlay above the footer

<!-- @trace
source: refine-display-page-effect-visuals
updated: 2026-05-26
code:
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - packages/shared/src/shellDecorations.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/routes/imagesSupport.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/components/displayPageIconResolver.tsx
  - packages/shared/src/types.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/db/seed.ts
tests:
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
-->