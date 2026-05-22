# sustainability-household-equivalent-storytelling Specification

## Purpose

TBD - created by archiving change 'add-sustainability-household-equivalent-cards'. Update Purpose after archive.

## Requirements

### Requirement: Derive household-equivalent cards from measured self-consumption

The system SHALL derive Sustainability household-equivalent cards from measured self-consumption data and a declared calculation profile instead of hand-authored household counts.

#### Scenario: Daily household-equivalent card resolves from daily self-consumption

- **WHEN** the Sustainability runtime reads a daily summary that includes the current day's self-consumption total
- **THEN** the `today` household-equivalent card derives its household count from that measured self-consumption and the selected calculation profile
- **AND** the card does not substitute total generation when self-consumption is unavailable

##### Example: Daily summary yields a household-equivalent headline

- **GIVEN** the current day's self-consumption total is available in the daily summary
- **AND** the selected calculation profile defines a four-person household daily bill basis
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the card outputs a headline in the form `X households of four`
- **AND** the derived result is tagged with the profile that produced it

#### Scenario: Cumulative household-equivalent card resolves from cumulative self-consumption

- **WHEN** the Sustainability runtime reads cumulative self-consumption counters
- **THEN** the `cumulative` household-equivalent card derives its household count from the measured cumulative self-consumption and the selected calculation profile's monthly household bill basis
- **AND** the card keeps cumulative equivalence separate from the current-day card


<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Keep household-equivalent assumptions visible to the operator-facing page

The system SHALL keep household-equivalent assumptions, profile identity, and disclaimer text available to the operator-facing Sustainability page even when the headline hides the underlying currency calculation.

#### Scenario: Sustainability renders the card disclaimer

- **WHEN** a household-equivalent card is rendered on Sustainability
- **THEN** the page can show the card's disclaimer and profile-backed assumption text alongside the derived household headline
- **AND** the visible headline remains centered on household count rather than raw currency

##### Example: Headline shows households while the disclaimer names the estimate basis

- **GIVEN** a derived card uses the default four-person household profile
- **WHEN** the page renders the card
- **THEN** the main headline reads `18 households of four`
- **AND** the supporting copy can state that the estimate is based on average four-person household usage and an estimated tariff


<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->

---
### Requirement: Surface unavailable state when the equivalence basis is missing

The system SHALL surface an unavailable state for household-equivalent cards when the required self-consumption basis or calculation profile is missing.

#### Scenario: Daily summary is unavailable

- **WHEN** the Sustainability runtime cannot read the current day's self-consumption basis for the daily household-equivalent card
- **THEN** the card resolves to an unavailable state
- **AND** the card explains that the estimate basis is unavailable instead of silently falling back to total generation

##### Example: Missing daily self-consumption blocks the today card

- **GIVEN** the daily summary has no valid `self_consumption_total` for the current date
- **AND** the cumulative self-consumption counter is still present
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the `today` card renders an unavailable state
- **AND** the runtime does not borrow the cumulative counter or total generation to fabricate a daily household count

<!-- @trace
source: add-sustainability-household-equivalent-cards
updated: 2026-05-22
code:
  - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.ts
  - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - packages/shared/src/sustainabilityStory.ts
  - apps/web/src/app/router.tsx
  - apps/server/src/server-startup.ts
  - apps/web/src/hooks/useDisplayPageConfig.ts
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/hooks/useImagesAutoplay.ts
  - apps/server/src/server.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/displayEditorSchema.ts
  - scripts/dev.test.mjs
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/cardRailInspectorActions.tsx
  - packages/shared/src/householdEquivalence.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - scripts/dev.mjs
  - apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - scripts/dev-lib.mjs
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - packages/shared/src/index.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - packages/shared/src/cloneValue.ts
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.ts
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/Sustainability/householdEquivalentRuntime.ts
tests:
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/SlideshowPreview/index.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/displayPageSeeds.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/hooks/useDisplayPageConfig.test.ts
  - apps/web/src/layouts/LayoutShell.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailAuthoring.test.ts
  - packages/shared/test/displayPageCardRail.test.ts
  - apps/web/src/layouts/offlineRouting.test.ts
  - apps/web/src/pages/FactoryCircuit/index.test.tsx
  - apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts
  - apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/shared/displayPageRouteHost.test.ts
  - apps/server/src/server-startup.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/app/playbackRouteMeta.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
-->