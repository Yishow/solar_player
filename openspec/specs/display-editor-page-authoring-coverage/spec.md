# display-editor-page-authoring-coverage Specification

## Purpose

TBD - created by archiving change 'expand-display-page-editor-page-specific-authoring-coverage'. Update Purpose after archive.

## Requirements

### Requirement: Provide page-specific authoring coverage for supported display pages

The system SHALL provide page-specific authoring coverage for supported display pages that currently stop at preview-only coverage. For pages that define a supported card rail, that coverage SHALL include the rail itself and its child cards as authorable items.

#### Scenario: Operator opens a page that previously had preview-only coverage

- **WHEN** the operator switches to a supported display page in `Display Pages Editor`
- **THEN** the editor SHALL expose page-specific editable regions and typed fields for that page
- **AND** the operator SHALL NOT see only a generic fallback message when page-specific authoring support now exists

#### Scenario: Card-rail-enabled page exposes child card authoring

- **WHEN** the operator opens a supported page that contains a card rail
- **THEN** the editor exposes authoring coverage for both the rail container and its child cards
- **AND** the child cards can participate in draft editing without requiring a page-local raw array workaround

##### Example: Sustainability page exposes household card authoring

- **GIVEN** the Sustainability page contains `household-equivalent` cards in its card rail
- **WHEN** the operator opens Sustainability in the editor
- **THEN** the editor exposes the card rail and each household-equivalent card as authorable items
- **AND** the operator can edit those cards without seeing only a generic rail array field


<!-- @trace
source: extend-display-editor-with-card-rail-authoring
updated: 2026-05-22
code:
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/index.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - scripts/dev-lib.mjs
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
-->

---
### Requirement: Keep page-specific authoring bound to the current draft session

The system SHALL keep new page-specific authoring controls bound to the current display-page draft session.

#### Scenario: Operator edits a page-specific field

- **WHEN** the operator updates a page-specific field from the inspector
- **THEN** the change SHALL remain part of the current draft session
- **AND** it SHALL participate in the existing save, reset, and preview-binding workflows

##### Example: Sustainability card title stays in the active draft

- **GIVEN** the operator is editing `sustainability` in `Display Pages Editor`
- **WHEN** they update a page-specific card title field from the inspector
- **THEN** the new title remains attached to the current draft session
- **AND** preview, save, and reset flows all reflect that draft-scoped value instead of dropping back to the previous published state

<!-- @trace
source: extend-display-editor-with-card-rail-authoring
updated: 2026-05-22
code:
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - packages/shared/src/cloneValue.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - packages/shared/src/index.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - scripts/dev-lib.mjs
  - packages/shared/src/displayEditorSchema.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
-->

---
### Requirement: Page-specific authoring coverage is not launch-complete without runtime parity witness

Page-specific authoring coverage SHALL NOT be treated as launch-complete unless the same page also has a documented runtime parity witness showing that editor-authored content survives save, reset, preview, and playback use.

#### Scenario: Editor coverage requires runtime parity before launch

- **WHEN** a page exposes typed fields and editable regions in `Display Pages Editor`
- **THEN** launch review still requires a runtime parity witness for that page
- **AND** editor-only completion does not automatically imply launch readiness

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - openspec/specs/display-editor-page-authoring-coverage/spec.md
  - openspec/specs/display-launch-witness-gates/spec.md
  - docs/reference-match/display-launch-witness-matrix.md
  - docs/reference-match/display-launch-verification-pack.md
tests:
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
-->

<!-- @trace
source: add-display-launch-witness-gates
updated: 2026-05-27
code:
  - docs/display-surface-visual-review-checklist.md
  - docs/reference-match/all-pages-checklist.md
  - .codex/hooks/fhd-evidence-reminder.js
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - README.md
  - apps/web/src/pages/Overview/layout.ts
  - CLAUDE.md
  - apps/web/src/layouts/ManagementShell.tsx
  - AGENTS.md
  - docs/FHD.01.html
  - apps/web/src/app/router.tsx
  - apps/web/src/layouts/LayoutShell.tsx
  - docs/reference-match/fhd-evidence-bundle-template.md
  - docs/reference-match/fhd-workflow-entrypoints.md
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/hooks/useHeaderWeatherMeta.ts
  - apps/web/src/components/DisplayPageLoadingState.tsx
  - docs/reference-match/display-launch-verification-pack.md
  - apps/web/src/layouts/shellBootstrap.ts
  - docs/README.md
  - apps/web/src/pages/shared/displayPageRouteHost.tsx
  - docs/reference-match/fhd-surface-split-guide.md
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - docs/reference-match/all-pages-audit.md
  - docs/reference-match/display-launch-witness-matrix.md
  - apps/web/src/hooks/useMqttStatus.ts
  - apps/web/src/pages/shared/displayPageRouteHost.css
  - apps/server/src/app.ts
  - .codex/hooks.json
  - .agents/skills/product-gap-audit/SKILL.md
  - docs/reference-match/fhd-exception-ledger-template.md
  - .agents/skills/display-asset-generation/README.md
  - docs/reference-match/playback-visual-canonicals.md
  - apps/web/src/pages/Overview/index.tsx
  - .agents/skills/display-asset-generation/SKILL.md
tests:
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/displayLaunchWitnessGates.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/DisplayPageLoadingState.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/web/src/layouts/shellBootstrap.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/fhdEvidenceWorkflow.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/fhdWorkflowEntrypoints.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
-->