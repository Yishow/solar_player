# display-page-card-rail-templates Specification

## Purpose

TBD - created by archiving change 'generalize-display-page-highlight-rails-to-card-rails'. Update Purpose after archive.

## Requirements

### Requirement: Persist template-based card rails in display page configuration

The system SHALL persist template-based card rails as part of shared display page configuration so draft, live, preview, and playback flows can all resolve the same rail contract.

#### Scenario: Operator saves a Sustainability card rail draft

- **WHEN** an operator saves a Sustainability draft that includes a card rail container and template-tagged cards
- **THEN** the saved draft includes the rail container geometry and each card's template, visibility, display order, frame, and content source
- **AND** the stored rail data uses the same shared display page configuration channel as the rest of the page

##### Example: Draft stores two cards with independent frames

- **GIVEN** the Sustainability draft contains a rail at `left=68`, `top=578`, `width=470`, `height=108`
- **WHEN** the draft stores cards `summary-1` and `summary-2`
- **THEN** each card keeps its own `frame`, `template`, and `displayOrder`
- **AND** the draft does not collapse them back into a fixed four-item text array


<!-- @trace
source: generalize-display-page-highlight-rails-to-card-rails
updated: 2026-05-22
code:
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - scripts/dev-lib.mjs
  - packages/shared/src/cloneValue.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/layouts/LayoutShell.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
-->

---
### Requirement: Render card rails through template resolvers

The system SHALL render card rail cards through a template resolver instead of assuming a single fixed summary item shape.

#### Scenario: Runtime resolves cards from template metadata

- **WHEN** a playback or preview route reads a card rail with visible cards
- **THEN** the route chooses the rendering path from each card's template key
- **AND** cards with different templates can coexist inside the same rail without requiring page-local render forks

##### Example: Metric highlight cards render from a template key

- **GIVEN** a card rail contains two cards with the `metric-highlight` template
- **WHEN** the Sustainability page resolves the rail for preview
- **THEN** each card renders from the `metric-highlight` template contract
- **AND** the page does not require a legacy `items[index]` assumption to show the content


<!-- @trace
source: generalize-display-page-highlight-rails-to-card-rails
updated: 2026-05-22
code:
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - scripts/dev-lib.mjs
  - packages/shared/src/cloneValue.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/layouts/LayoutShell.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
-->

---
### Requirement: Keep metric highlight cards as a first-class compatibility template

The system SHALL treat existing summary highlights as the `metric-highlight` template so prior summary cards remain editable and renderable after the rail schema upgrade.

#### Scenario: Existing highlight seed data is upgraded to metric-highlight cards

- **WHEN** an existing Sustainability seed or saved config is read through the new card rail contract
- **THEN** legacy summary highlights are represented as `metric-highlight` cards with equivalent value, unit, and label content
- **AND** the resulting preview remains visually compatible with the prior summary rail layout

##### Example: Four summary highlights survive the schema migration

- **GIVEN** the prior seed had four highlight summaries for monthly carbon reduction, annual energy saving, green power self-use, and tree equivalence
- **WHEN** the page reads that seed through the card rail contract
- **THEN** the rail exposes four `metric-highlight` cards carrying the same visible content
- **AND** no separate legacy renderer is required

<!-- @trace
source: generalize-display-page-highlight-rails-to-card-rails
updated: 2026-05-22
code:
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/index.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/app/playbackRouteMeta.ts
  - scripts/dev-lib.mjs
  - packages/shared/src/cloneValue.ts
  - apps/server/src/server-startup.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - scripts/dev.test.mjs
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/layouts/LayoutShell.tsx
tests:
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/displayPageSeeds.test.ts
-->