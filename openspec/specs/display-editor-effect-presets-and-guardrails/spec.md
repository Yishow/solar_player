# display-editor-effect-presets-and-guardrails Specification

## Purpose

TBD - created by archiving change 'add-display-editor-effect-summary-presets-and-guardrails'. Update Purpose after archive.

## Requirements

### Requirement: Summarize the active effect stack in a read-only companion surface

The system SHALL summarize the active effect stack in a read-only companion surface so the operator can understand the current effect composition without reopening every editable control.

#### Scenario: Operator inspects a media source with three active layers

- **WHEN** the media source has three active effect layers
- **THEN** the summary surface lists the active layers, their zones, and their primary parameters
- **AND** the operator can understand the current stack at a glance

##### Example: Source Connection lists active layers

- **GIVEN** a media source has top-zone mist, top-zone blur, and full-frame opacity
- **WHEN** the operator opens the summary surface
- **THEN** all three active layers are summarized
- **AND** the summary does not require the operator to decode hidden internals


<!-- @trace
source: add-display-editor-effect-summary-presets-and-guardrails
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
-->

---
### Requirement: Offer editable presets for common composable effect setups

The system SHALL offer editable presets for common composable effect setups. Applying a preset SHALL generate normal editable effect layers rather than a locked template blob.

#### Scenario: Operator applies a preset

- **WHEN** the operator applies a common preset such as top mist or all-edge fade
- **THEN** the system creates the corresponding effect layers
- **AND** those layers remain editable through the normal effect inspector

##### Example: Preset creates editable layers

- **GIVEN** the operator chooses a top-mist preset
- **WHEN** the preset is applied
- **THEN** the resulting layers appear in the effect inspector
- **AND** the operator can still edit zone coverage, feather, and strength manually


<!-- @trace
source: add-display-editor-effect-summary-presets-and-guardrails
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
-->

---
### Requirement: Provide guardrails for extreme ranges and conflicting stacks

The system SHALL provide guardrails when effect ranges are extreme or when effect stacks are likely to produce unreadable or self-canceling results.

#### Scenario: Operator creates an extreme overlapping stack

- **WHEN** the operator configures extreme coverage or a same-zone stack likely to over-soften the image
- **THEN** the editor provides visible feedback about that risky combination
- **AND** the operator is not left without any explanation

##### Example: Over-softened top zone shows a warning

- **GIVEN** multiple strong blur and mist layers target the same top zone
- **WHEN** the configured stack exceeds the recommended visual range
- **THEN** the editor surfaces a warning or guardrail message
- **AND** the stack remains understandable rather than silently degrading the result

<!-- @trace
source: add-display-editor-effect-summary-presets-and-guardrails
updated: 2026-05-27
code:
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - .agents/skills/product-gap-audit/SKILL.md
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/styles/tokens.css
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/components/workspaceSurface.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.css
  - apps/web/src/pages/DisplayPagesEditor/canvasCard.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ShellDecorationEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/ShellDecorationEditor/assetPicker.tsx
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - apps/web/src/pages/AssetLibrary/index.tsx
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
tests:
  - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreview.test.ts
  - apps/web/src/pages/ShellDecorationEditor/index.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/AssetLibrary/index.test.tsx
  - apps/web/src/pages/ImageManagement/index.test.tsx
-->