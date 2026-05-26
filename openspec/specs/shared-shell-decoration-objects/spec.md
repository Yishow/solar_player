# shared-shell-decoration-objects Specification

## Purpose

TBD - created by archiving change 'add-shared-shell-decoration-schema'. Update Purpose after archive.

## Requirements

### Requirement: Store shared shell decoration objects separately from page configs
The system SHALL store shared shell decoration objects in a dedicated shared configuration envelope instead of any individual display page config. The envelope SHALL provide separate `draft` and `live` channels and SHALL keep `headerObjects` and `footerObjects` distinct so the whole shell can be authored without assigning ownership to a single page.

#### Scenario: Operator saves draft shell decoration changes
- **WHEN** an operator saves shell decoration changes without publishing them
- **THEN** the system stores those changes in the shared shell decoration `draft` channel
- **AND** the current `live` shell decoration configuration remains unchanged for playback routes

##### Example: Draft header line does not replace live footer ornament
- **GIVEN** the current `live` shell decoration config contains one footer ornament object
- **AND** the operator saves a `draft` config containing two header line objects
- **WHEN** the draft save completes
- **THEN** the `draft.headerObjects` list contains the two line objects
- **AND** the `live.footerObjects` list still contains the original ornament object


<!-- @trace
source: add-shared-shell-decoration-schema
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
tests:
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->

---
### Requirement: Shell decoration objects use a shared base object schema
The system SHALL define shell decoration objects with a shared base object schema that can also be reused by future page freeform objects. Each shell decoration object SHALL include a stable `id`, a supported `type`, a `mount`, a `frame`, visibility and lock flags, deterministic z-order metadata, and a typed source or style payload.

#### Scenario: Stored shell object exposes the common object fields
- **WHEN** a shell decoration object is read from the shared contract
- **THEN** the object includes the base object fields required for future shared tooling
- **AND** the `mount` value is restricted to `header` or `footer`

##### Example: Header asset image object uses the shared shape
- **GIVEN** a stored shell object of type `asset-image`
- **WHEN** the object is returned through the shared shell decoration contract
- **THEN** it includes `id`, `type`, `mount`, `frame`, `visible`, `locked`, `zIndex`, `source`, `style`, and `metadata`
- **AND** `mount` equals `header`


<!-- @trace
source: add-shared-shell-decoration-schema
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
tests:
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->

---
### Requirement: Shell decoration publish validation enforces band-safe geometry and supported sources
The system SHALL validate shell decoration objects before publish. Validation SHALL reject objects whose frames overflow their header or footer band, whose type is unsupported, whose source payload is malformed, or whose ordering cannot be resolved deterministically.

#### Scenario: Publish rejects a header object that leaves the header band
- **WHEN** a shell decoration object mounted to `header` extends outside the allowed header band
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending object instead of silently clipping it

##### Example: Header line crosses into the content band
- **GIVEN** the header band height is `110`
- **AND** a `header` line object stores `top=96` and `height=28`
- **WHEN** the operator tries to publish the shell decoration config
- **THEN** publish is rejected because the object crosses the header band boundary
- **AND** the finding names that line object's `id`

#### Scenario: Publish rejects malformed source payloads
- **WHEN** a shell decoration object uses `asset-image` or `ornament-image` with a malformed source payload
- **THEN** the publish request is rejected
- **AND** the validation findings explain whether the failure came from an unsupported source mode or an incomplete asset reference

##### Example: Asset image object omits the managed asset reference
- **GIVEN** a footer object of type `asset-image`
- **AND** its source payload omits the required managed asset reference and fallback source
- **WHEN** the operator tries to publish the config
- **THEN** publish is rejected
- **AND** the validation finding identifies the malformed source payload for that object

<!-- @trace
source: add-shared-shell-decoration-schema
updated: 2026-05-26
code:
  - packages/shared/src/shellDecorations.ts
  - apps/web/src/services/shellDecorations.ts
  - apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - packages/shared/src/types.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/server/src/services/displayPageAssetService.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/services/api.ts
  - apps/web/src/hooks/useShellDecorations.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/components/ShellDecorationLayer.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/server/src/routes/images.ts
  - apps/server/src/db/migrations/012_display_asset_metadata.sql
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/components/DisplayPageObjectLayer.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/runtime.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
  - apps/server/src/routes/shell-decorations.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/server/src/services/displaySeedAssetManifest.ts
  - apps/server/src/services/shellDecorationService.ts
  - packages/shared/src/managementDraftSave.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/db/migrations/011_shell_decorations.sql
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/displayOps.ts
  - apps/server/src/services/displaySeedAssetBootstrapService.ts
  - apps/server/src/services/displayPageObjectValidation.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/displayOpsService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/components/displayPageIconResolver.tsx
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/shared/displayIconSourceConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayPageObjects.ts
  - apps/server/src/app.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/localization.ts
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
tests:
  - apps/server/src/routes/display-ops.test.ts
  - apps/server/src/services/displayPageObjectValidation.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/components/displayPageIconResolver.test.tsx
  - packages/shared/src/displayPageObjects.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/components/displayPageAssetHealthPanels.test.tsx
  - apps/web/src/components/DisplayPageObjectLayer.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/components/ShellDecorationLayer.test.ts
  - apps/web/src/pages/ShellDecorationEditor/canvasAuthoring.test.ts
  - apps/web/src/hooks/useShellDecorations.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/shared/DisplayLeafOrnament.test.tsx
  - apps/web/src/services/api.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/server/src/routes/images.test.ts
  - packages/shared/src/shellDecorations.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/server/src/services/displaySeedAssetBootstrapService.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/routes/shell-decorations.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/displayPageFreeformObjectRuntime.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
-->