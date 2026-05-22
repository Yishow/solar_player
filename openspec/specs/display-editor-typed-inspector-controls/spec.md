# display-editor-typed-inspector-controls Specification

## Purpose

TBD - created by archiving change 'add-display-editor-schema-aware-inspector'. Update Purpose after archive.

## Requirements

### Requirement: Describe region fields with a schema-aware inspector contract

The system SHALL describe display editor region fields with a schema-aware inspector contract so the UI can render typed controls consistently, and supported display pages SHALL use that contract for their page-specific authoring controls instead of stopping at preview-only coverage. Card rail child cards SHALL also use template-aware typed controls instead of raw array item editing.

#### Scenario: Inspector renders mixed field types

- **WHEN** a region schema includes text, number, toggle, select, or array-backed fields
- **THEN** the inspector renders those typed controls from the schema
- **AND** the field values remain bound to the editable draft
- **AND** supported page-specific authoring flows use the same inspector contract instead of bypassing it with page-local special cases

##### Example: Highlight rail region renders text and array-backed controls

- **GIVEN** a region schema includes a text label, numeric geometry fields, and array-backed highlight items
- **WHEN** the operator selects that region in the editor
- **THEN** the inspector renders the correct typed controls for each field
- **AND** editing those controls updates the current draft binding

#### Scenario: Inspector swaps field sets when a rail card template changes

- **WHEN** the operator selects a rail card and changes its template
- **THEN** the inspector renders the typed fields defined for the new template
- **AND** fields that belong only to the previous template stop appearing as editable controls

##### Example: Household-equivalent card shows template-specific fields

- **GIVEN** a rail card uses the `household-equivalent` template
- **WHEN** the operator selects that card
- **THEN** the inspector shows fields such as eyebrow, supporting line, disclaimer, and calculation-profile metadata
- **AND** the operator does not need to edit those values through a generic JSON row


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
### Requirement: Enforce typed inspector constraints during editing

The system SHALL enforce typed inspector constraints such as ranges, required values, or compatibility checks during editing.

#### Scenario: Operator enters invalid field value

- **WHEN** the operator enters a value outside the schema constraints
- **THEN** the inspector surfaces that invalid state
- **AND** the invalid value does not silently appear as valid content

##### Example: Negative width is rejected by the inspector

- **GIVEN** a geometry field requires a non-negative width
- **WHEN** the operator enters `-24` for that width
- **THEN** the inspector marks the field invalid
- **AND** the value is not silently treated as an acceptable saved width

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