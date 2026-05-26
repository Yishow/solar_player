# display-editor-source-connection-panel Specification

## Purpose

TBD - created by archiving change 'add-display-editor-source-connection-panel'. Update Purpose after archive.

## Requirements

### Requirement: Display editor exposes a right-side source connection tab

The system SHALL expose a `來源連接` tab in the right-side panel of `/display-pages/editor`. The tab SHALL preserve the current selected editor item and SHALL summarize how that item is connected to its visual or content source.

#### Scenario: Operator selects a hero media region

- **WHEN** the operator selects a hero media region and opens `來源連接`
- **THEN** the panel shows the current source mode
- **AND** the panel identifies whether the region uses seed default, managed asset, direct source, or fallback source
- **AND** switching between `屬性` and `來源連接` does not change the selected region

##### Example: Overview hero uses seed default source

- **GIVEN** the Overview hero media is selected
- **AND** its source mode is `seed-default`
- **WHEN** the operator opens `來源連接`
- **THEN** the panel shows that the current source is the seed/default Overview hero asset
- **AND** it offers replacement actions only when a managed asset replacement path is available


<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->

---
### Requirement: Source connection tab provides replacement and navigation actions

The source connection tab SHALL provide source-oriented actions for eligible selections, including replacing from gallery, opening the integrated asset library workspace, restoring seed/default source, and returning to `屬性` for presentation controls. Actions whose implementation depends on another pending capability SHALL be disabled with an explanation instead of hidden silently.

#### Scenario: Operator opens gallery replacement for a card icon

- **WHEN** a selected card icon supports managed asset replacement
- **THEN** `來源連接` offers a gallery replacement action
- **AND** opening the asset library stays within `/display-pages/editor`
- **AND** returning from the asset library preserves the original editor selection context

##### Example: Unsupported registry icon explains why replacement is unavailable

- **GIVEN** a selected icon still only supports a built-in registry key
- **WHEN** the operator opens `來源連接`
- **THEN** the replacement action is disabled
- **AND** the panel explains that managed visual replacement is not yet available for that source type


<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->

---
### Requirement: Source connection tab keeps presentation controls in Properties

The source connection tab SHALL NOT duplicate image effect, opacity, fade, blur, geometry, layout, or text controls. It SHALL show read-only summaries of active presentation settings when those settings apply to the selected item and SHALL provide a jump back to `屬性` when the operator needs to edit those settings.

#### Scenario: Operator inspects media with edge fade and blur

- **WHEN** the selected media region has edge fade, blur, opacity, or fit mode settings
- **THEN** `來源連接` shows a concise read-only summary of those presentation settings
- **AND** the editable controls remain in `屬性`
- **AND** the panel provides an action to return to `屬性`

##### Example: Blur summary does not create duplicate controls

- **GIVEN** an Images main stage media region has blur enabled
- **WHEN** the operator opens `來源連接`
- **THEN** the panel summarizes the blur state
- **AND** no editable blur amount input is rendered in `來源連接`

<!-- @trace
source: add-display-editor-source-connection-panel
updated: 2026-05-27
code:
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - packages/shared/src/types.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/display-ops.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/server/src/routes/images.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
-->