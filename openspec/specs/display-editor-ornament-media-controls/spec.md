# display-editor-ornament-media-controls Specification

## Purpose

TBD - created by archiving change 'extend-display-editor-ornament-and-media-controls'. Update Purpose after archive.

## Requirements

### Requirement: Media tone effects are editor-backed

The system SHALL expose full-frame media tone controls for supported display media surfaces. Tone controls SHALL include saturation and contrast and SHALL be represented through the shared media effect model.

#### Scenario: Tone layer applies saturation and contrast

- **GIVEN** a display media binding has an enabled full-frame tone layer with saturation `1.18` and contrast `1.08`
- **WHEN** the runtime builds the media presentation for that binding
- **THEN** the media style filter includes `saturate(1.18)` and `contrast(1.08)`
- **AND** existing full-frame blur and opacity behavior remains available

#### Scenario: Media effect inspector can create tone layers

- **GIVEN** a media effect surface advertises tone support
- **WHEN** the editor appends a tone effect layer
- **THEN** the new layer uses the full-frame zone
- **AND** the inspector renders editable saturation and contrast controls


<!-- @trace
source: extend-display-editor-ornament-and-media-controls
updated: 2026-06-07
code:
  - packages/shared/src/displayStory.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - uploads/overview_bg-1.png
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Sustainability/sustainability.css
  - uploads/overview_bg-4.png
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Images/index.tsx
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Ornament base geometry is editor-backed

The system SHALL store ornament base geometry in display chrome config when a playback ornament currently depends on page-local hardcoded base layout. Runtime SHALL apply offsets relative to the configured base geometry.

#### Scenario: Solar gold line uses configured base geometry and rotation

- **GIVEN** the Solar display config sets gold line base left `0`, top `500`, width `1075`, and rotation `-4`
- **WHEN** `/solar` renders
- **THEN** the gold line style uses those resolved base values
- **AND** the rotation is applied through the display gold-line CSS variable

#### Scenario: Solar leaf uses configured base geometry

- **GIVEN** the Solar display config sets leaf base left `565`, top `330`, width `190`, and height `132`
- **WHEN** `/solar` renders
- **THEN** the leaf ornament style uses those resolved base values plus configured offsets

#### Scenario: Sustainability leaf uses configured base geometry

- **GIVEN** the Sustainability display config sets leaf base left `520`, top `564`, width `178`, and height `96`
- **WHEN** `/sustainability` renders
- **THEN** the leaf ornament style uses those resolved base values plus configured offsets
- **AND** missing base geometry falls back to seed values


<!-- @trace
source: extend-display-editor-ornament-and-media-controls
updated: 2026-06-07
code:
  - packages/shared/src/displayStory.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - uploads/overview_bg-1.png
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Sustainability/sustainability.css
  - uploads/overview_bg-4.png
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Images/index.tsx
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Images stage and thumbnail framing are editor-backed

The system SHALL expose editor-backed Images main stage and thumbnail framing controls. Runtime SHALL use resolved config for stage radius, shadow, full-bleed mode, and thumbnail radius instead of relying on active image source identity.

#### Scenario: Images full-bleed framing is config-driven

- **GIVEN** the Images display config sets main stage `fullBleed` to `true`
- **WHEN** `/images` renders the main stage
- **THEN** the stage uses zero radius and no shadow
- **AND** media overlays and the info card are hidden because of config
- **AND** runtime does not use `isReferenceHeroCrop` to decide this framing

#### Scenario: Images thumbnail radius uses resolved config

- **GIVEN** the Images display config sets thumbnail radius to `28`
- **WHEN** `/images` renders thumbnails
- **THEN** thumbnail buttons and thumbnail images use the resolved radius


<!-- @trace
source: extend-display-editor-ornament-and-media-controls
updated: 2026-06-07
code:
  - packages/shared/src/displayStory.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - uploads/overview_bg-1.png
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Sustainability/sustainability.css
  - uploads/overview_bg-4.png
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Images/index.tsx
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->

---
### Requirement: Existing ring treatment remains wired

The system SHALL keep Sustainability ring thickness and glow opacity editor-backed through the existing ring ornament chrome config.

#### Scenario: Sustainability ring keeps existing thickness and glow fields

- **GIVEN** the Sustainability editor regions include the ring ornament region
- **WHEN** the ring region fields are inspected
- **THEN** it exposes ring thickness and ring glow opacity fields
- **AND** runtime applies `--display-ring-thickness` and `--display-ring-glow-opacity`

<!-- @trace
source: extend-display-editor-ornament-and-media-controls
updated: 2026-06-07
code:
  - packages/shared/src/displayStory.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/overview.css
  - apps/server/src/services/displayStoryService.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/layout.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - apps/web/src/hooks/useOverviewWeather.ts
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - uploads/overview_bg-1.png
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - uploads/overview_bg-3.png
  - apps/web/src/pages/Sustainability/sustainability.css
  - uploads/overview_bg-4.png
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/Images/index.tsx
  - data/server-runtime.lock.json
tests:
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/Overview/cardVisibility.test.ts
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
-->