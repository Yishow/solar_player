# display-editor-composable-effect-inspector Specification

## Purpose

TBD - created by archiving change 'build-display-editor-composable-effect-inspector'. Update Purpose after archive.

## Requirements

### Requirement: Represent composable media effects as an editable layer list in Properties

The system SHALL represent composable media effects as an editable layer list in the `屬性` panel for eligible media surfaces.

#### Scenario: Operator adds a second effect layer

- **WHEN** the operator edits an eligible media surface in `屬性`
- **THEN** they can add a second effect layer without replacing the first
- **AND** each layer retains its own kind, zone, and parameter fields

##### Example: Operator keeps mist and adds blur

- **GIVEN** a media source already has one mist layer
- **WHEN** the operator adds a blur layer
- **THEN** both layers remain editable in the inspector
- **AND** the blur layer does not overwrite the mist layer


<!-- @trace
source: build-display-editor-composable-effect-inspector
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
-->

---
### Requirement: Route visible canvas selections to the owning media effect source

The system SHALL route visible container selections to the owning media effect source before rendering the editable effect inspector.

#### Scenario: Operator clicks a hero container on canvas

- **WHEN** the operator clicks a visible hero container that is not itself the effect data owner
- **THEN** the editor routes authoring to the owning media source
- **AND** the effect inspector becomes available without requiring a manual region-tree detour

##### Example: Background container opens the real effect owner

- **GIVEN** the visible background frame belongs to a media source region
- **WHEN** the operator clicks that frame
- **THEN** the editor opens the effect controls for the owning media source
- **AND** the user does not have to guess the internal authoring node


<!-- @trace
source: build-display-editor-composable-effect-inspector
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
-->

---
### Requirement: Keep Source Connection effect information summary-only

The system SHALL keep Source Connection effect information summary-only while editable composable effect controls remain in `屬性`.

#### Scenario: Operator inspects effect state in Source Connection

- **WHEN** the operator opens `來源連接` for a media source with active effect layers
- **THEN** the panel summarizes the effect stack
- **AND** it does not render editable effect fields there

##### Example: Source Connection shows stack summary only

- **GIVEN** a media source has multiple active effect layers
- **WHEN** the operator opens `來源連接`
- **THEN** the active stack is summarized
- **AND** editable controls remain only in `屬性`

<!-- @trace
source: build-display-editor-composable-effect-inspector
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
-->