# display-editor-layer-authoring-surface Specification

## Purpose

TBD - created by archiving change 'extend-display-editor-layer-authoring-beyond-object-lists'. Update Purpose after archive.

## Requirements

### Requirement: Expose layer controls from the current selection for reorderable authoring nodes

The system SHALL expose layer controls from the current selection context for reorderable authoring nodes in `/display-pages/editor`. The operator SHALL NOT need to rely on the left object list as the only place where z-order can be changed.

#### Scenario: Operator selects a reorderable freeform object

- **WHEN** the operator selects a reorderable freeform object on the canvas
- **THEN** the editor shows layer controls for that object from the current selection context
- **AND** invoking those controls updates the same ordering state used by the object list

##### Example: Freeform object can move forward without leaving the canvas context

- **GIVEN** a page freeform object supports stacking order changes
- **WHEN** the operator selects that object and chooses a layer action
- **THEN** the object order changes immediately
- **AND** the left object list reflects the same new order


<!-- @trace
source: extend-display-editor-layer-authoring-beyond-object-lists
updated: 2026-05-27
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/workspaceSurface.tsx
tests:
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
-->

---
### Requirement: Explain fixed-layout regions that do not support layer authoring

The system SHALL explain when the selected region belongs to fixed page layout rather than reorderable authoring. It SHALL NOT leave the operator to infer whether layer editing is missing or merely hidden.

#### Scenario: Operator selects a fixed background region

- **WHEN** the operator selects a fixed-layout page region that does not support z-order editing
- **THEN** the editor does not show active layer controls for that region
- **AND** it explains that the region's layer is fixed by the page template

##### Example: Background region is identified as fixed-layout

- **GIVEN** a page background belongs to the template-defined layout stack
- **WHEN** the operator inspects that selection
- **THEN** the editor states that layer ordering is not editable for that region
- **AND** the absence of controls is explicit rather than silent


<!-- @trace
source: extend-display-editor-layer-authoring-beyond-object-lists
updated: 2026-05-27
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/workspaceSurface.tsx
tests:
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
-->

---
### Requirement: Distinguish z-order authoring from selection-routed media-effect editing

The system SHALL distinguish z-order authoring eligibility from media-effect authoring support. A selection that routes to a media-effect-owning source SHALL NOT automatically be treated as reorderable unless that node explicitly supports layer ordering.

#### Scenario: Operator selects a media surface that supports effects but not reordering

- **WHEN** the operator selects a fixed-layout media container that routes to an effect-owning source region
- **THEN** the editor SHALL show either media-effect authoring or an unsupported effect explanation for that source
- **AND** it does not show z-order controls unless the resolved node is explicitly reorderable

##### Example: Fixed hero media keeps effect editing separate from layer ordering

- **GIVEN** a hero media source supports composable effects but remains part of a fixed template stack
- **WHEN** the operator opens the selection context for that surface
- **THEN** the editor keeps effect editing available
- **AND** it separately explains that layer ordering is not editable for that selection


<!-- @trace
source: extend-display-editor-layer-authoring-beyond-object-lists
updated: 2026-05-27
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/workspaceSurface.tsx
tests:
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
-->

---
### Requirement: Keep parallel layer entry points synchronized

The system SHALL keep layer controls in the object list, shell object list, and current selection context synchronized. Any reorder action from one entry point SHALL update the others without divergence.

#### Scenario: Operator reorders a shell object from the inspector

- **WHEN** the operator reorders a shell decoration object from the current selection context
- **THEN** the shell object list updates to reflect the new order
- **AND** subsequent reorder actions from the list continue from the same ordering state

##### Example: Shell object order remains coherent across entry points

- **GIVEN** a shell ornament object is selected in the integrated shell workspace
- **WHEN** the operator moves it backward from the selection-side controls
- **THEN** the object list displays the updated order
- **AND** no conflicting order is shown between inspector and list

<!-- @trace
source: extend-display-editor-layer-authoring-beyond-object-lists
updated: 2026-05-27
code:
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/components/workspaceSurface.tsx
tests:
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
-->