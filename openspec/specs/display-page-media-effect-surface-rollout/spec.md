# display-page-media-effect-surface-rollout Specification

## Purpose

TBD - created by archiving change 'roll-out-composable-media-effects-to-supported-page-surfaces'. Update Purpose after archive.

## Requirements

### Requirement: Declare composable effect support per media surface

The system SHALL declare composable media effect support per media surface rather than per page in the abstract.

#### Scenario: A page has two media surfaces with different support

- **WHEN** a page contains two distinct media surfaces
- **THEN** each surface can declare a different composable-effect support matrix
- **AND** editor/runtime consumers follow the surface-level declaration

##### Example: One media surface supports localized zones while another does not

- **GIVEN** a page contains a hero media surface and a secondary decorative media surface
- **WHEN** support is declared
- **THEN** the hero surface can allow localized composable effects
- **AND** the decorative surface can remain unsupported with an explicit explanation


<!-- @trace
source: roll-out-composable-media-effects-to-supported-page-surfaces
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
-->

---
### Requirement: Start rollout from the most visible managed media surfaces

The system SHALL start composable-effect rollout from the most visible managed media surfaces, including Overview hero and Images main stage, before expanding to less critical surfaces.

#### Scenario: Operator edits an Overview hero media source

- **WHEN** the operator edits the Overview hero media source
- **THEN** the composable effect authoring experience is available there
- **AND** the support matrix for that surface includes the enabled effect kinds and zones

##### Example: Images main stage is first-batch enabled

- **GIVEN** the Images main stage media source
- **WHEN** the first-batch rollout is applied
- **THEN** the source exposes composable effect authoring
- **AND** it no longer depends on the legacy half-complete effect surface


<!-- @trace
source: roll-out-composable-media-effects-to-supported-page-surfaces
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
-->

---
### Requirement: Explain unsupported media surfaces explicitly during rollout

The system SHALL explain unsupported media surfaces explicitly during rollout rather than silently omitting controls.

#### Scenario: Operator selects a not-yet-enabled media surface

- **WHEN** the operator selects a media surface outside the rollout matrix
- **THEN** the editor explains that composable effects are not yet enabled for that surface
- **AND** the absence of controls is explicit rather than ambiguous

##### Example: Unsupported surface presents a reason

- **GIVEN** a secondary media surface has not been enabled for composable effects
- **WHEN** the operator inspects it
- **THEN** the editor provides an unsupported explanation
- **AND** the user is not left guessing whether the feature is broken

<!-- @trace
source: roll-out-composable-media-effects-to-supported-page-surfaces
updated: 2026-05-27
code:
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
tests:
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
-->