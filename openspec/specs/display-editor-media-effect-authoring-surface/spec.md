# display-editor-media-effect-authoring-surface Specification

## Purpose

TBD - created by archiving change 'complete-display-editor-media-effect-authoring-surface'. Update Purpose after archive.

## Requirements

### Requirement: Model media effects as composable effect layers with explicit target zones

The system SHALL model display-page media effects as composable effect layers. Each enabled effect layer SHALL declare its effect type, target zone, and zone parameters so that multiple effects can be applied to the same media source and, when supported, to the same visual zone.

#### Scenario: Operator stacks two effects on the same top zone

- **WHEN** the operator applies both mist and blur to the same top zone of a supported media source
- **THEN** the media source keeps both effect layers active
- **AND** the resulting presentation applies both effects to that target zone
- **AND** the system does not force one effect to replace the other merely because they share the same zone

##### Example: Top-zone mist and blur coexist

- **GIVEN** a supported hero media source
- **WHEN** the operator configures top-zone mist and top-zone blur together
- **THEN** the hero presentation shows both effects on the configured top band
- **AND** the rest of the image remains outside that localized stack unless explicitly targeted


<!-- @trace
source: complete-display-editor-media-effect-authoring-surface
updated: 2026-05-27
code:
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Support directional and percentage-based zone controls symmetrically

The system SHALL support zone controls symmetrically across top, bottom, left, right, dual-edge combinations, and all-edges scopes for supported effect types. Zone coverage and related range values SHALL be percentage-based rather than split into unrelated width-only or height-only controls.

#### Scenario: Operator chooses a top or all-edges effect zone

- **WHEN** the operator edits a supported effect layer
- **THEN** the layer can target top, bottom, left, right, top-bottom, left-right, or all-edges scopes as allowed by that media surface
- **AND** the operator can configure percentage-based coverage for the targeted zone

##### Example: Top 18 percent mist and all-edge feathering share one control language

- **GIVEN** a supported media source
- **WHEN** the operator creates one effect layer for the top 18 percent and another for all edges
- **THEN** both layers use the same zone and percentage-style authoring language
- **AND** the operator does not have to switch between unrelated width-only and height-only controls


<!-- @trace
source: complete-display-editor-media-effect-authoring-surface
updated: 2026-05-27
code:
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Expose media effect controls from the operator's visible selection context

The system SHALL expose media effect controls for eligible display media surfaces from the selection context that operators actually click in `/display-pages/editor`. When the visible selection is a container or frame rather than the owning source region, the editor SHALL resolve that selection back to the effect-owning media source before rendering editable controls.

#### Scenario: Operator selects a visible hero container

- **WHEN** the operator selects a visible hero or stage container whose media source owns effect settings
- **THEN** the editor resolves the selection to the owning media source region for authoring
- **AND** the `屬性` panel renders the editable composable effect controls for that source

##### Example: Overview hero container opens media effect controls

- **GIVEN** the Overview hero media supports composable media effect controls
- **WHEN** the operator clicks the visible Overview hero container
- **THEN** the editor shows the effect controls in `屬性`
- **AND** the editor indicates that the visible selection has been linked to the owning media source


<!-- @trace
source: complete-display-editor-media-effect-authoring-surface
updated: 2026-05-27
code:
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Declare media effect authoring eligibility explicitly per page media surface

The system SHALL declare whether each page media surface supports composable media effect authoring, including which effect types and target zones are available there. Unsupported surfaces SHALL produce an explicit explanation instead of silently omitting controls.

#### Scenario: Operator selects a media surface without effect support

- **WHEN** the selected page media surface does not declare media effect authoring support
- **THEN** the editor does not render editable effect controls for that surface
- **AND** it explains that the selected media surface does not currently support the requested effect authoring model

##### Example: Unsupported media surface does not fail silently

- **GIVEN** a page media surface has source controls but no declared composable effect-authoring support
- **WHEN** the operator opens `屬性`
- **THEN** the panel does not show a partial or empty effect form
- **AND** it shows a reason why effect authoring is unavailable for that surface


<!-- @trace
source: complete-display-editor-media-effect-authoring-surface
updated: 2026-05-27
code:
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->

---
### Requirement: Keep media effect editing in Properties and summaries in Source Connection

The system SHALL keep editable media effect controls in `屬性`. `來源連接` SHALL provide read-only summaries of the active effect stack and a jump back to `屬性`, and SHALL NOT duplicate editable effect fields.

#### Scenario: Operator inspects media effects through Source Connection

- **WHEN** the selected media source has active composable effect layers
- **THEN** `來源連接` shows a concise summary of the active presentation state
- **AND** the panel offers a way to return to `屬性`
- **AND** no editable effect inputs are rendered in `來源連接`

##### Example: Source Connection stays summary-only

- **GIVEN** an Images main stage media source has one or more active effect layers
- **WHEN** the operator opens `來源連接`
- **THEN** the panel summarizes the active effect stack
- **AND** the editable effect controls remain only in `屬性`

<!-- @trace
source: complete-display-editor-media-effect-authoring-surface
updated: 2026-05-27
code:
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/components/workspaceSurface.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
-->