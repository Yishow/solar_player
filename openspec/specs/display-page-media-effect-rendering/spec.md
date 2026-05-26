# display-page-media-effect-rendering Specification

## Purpose

TBD - created by archiving change 'render-composable-display-page-media-effects'. Update Purpose after archive.

## Requirements

### Requirement: Render normalized media effect layers into bounded composable presentation

The system SHALL render normalized media effect layers into bounded media presentation. Localized zone effects and full-frame effects SHALL be able to coexist on the same media source.

#### Scenario: Media source combines full-frame opacity with top-zone mist

- **WHEN** a media source has both a full-frame opacity layer and a top-zone mist layer
- **THEN** the rendered presentation applies both layers
- **AND** the top-zone treatment remains localized to its configured band

##### Example: Whole-image opacity and top-zone mist coexist

- **GIVEN** a supported hero media source
- **WHEN** it has full-frame opacity and top-zone mist
- **THEN** the full frame remains dimmed
- **AND** the top zone receives its additional localized mist treatment


<!-- @trace
source: render-composable-display-page-media-effects
updated: 2026-05-27
code:
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Preserve same-zone stacking order for composable effects

The system SHALL preserve same-zone stacking order when multiple effect layers target the same zone.

#### Scenario: Two layers target the left zone

- **WHEN** two enabled effect layers target the left zone
- **THEN** both layers are rendered in order
- **AND** neither layer is silently dropped merely because they share the same zone

##### Example: Left-zone fade and blur stay stacked

- **GIVEN** a media source has left-zone fade and left-zone blur
- **WHEN** the media presentation is built
- **THEN** the left zone renders both effects
- **AND** the resulting presentation reflects their configured order


<!-- @trace
source: render-composable-display-page-media-effects
updated: 2026-05-27
code:
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Keep composable effect overlays bounded to the owning media layer

The system SHALL keep composable effect overlays bounded to the owning media layer. Media effect overlays SHALL NOT extend above shell chrome or unrelated page content.

#### Scenario: Page uses bottom-edge effects near footer chrome

- **WHEN** a page media source uses bottom-edge effects near footer chrome
- **THEN** the effect remains clipped to the media stage
- **AND** the footer chrome remains readable and unaffected by overlay spillover

##### Example: Footer stays outside the media effect stack

- **GIVEN** a playback page renders a bottom-edge effect
- **WHEN** the page is displayed with shell footer chrome
- **THEN** the footer remains outside the effect overlay
- **AND** the media layer owns the entire effect stack

<!-- @trace
source: render-composable-display-page-media-effects
updated: 2026-05-27
code:
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
tests:
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->