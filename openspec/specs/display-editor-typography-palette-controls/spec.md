# display-editor-typography-palette-controls Specification

## Purpose

TBD - created by archiving change 'extend-typography-palette-and-fix-ornament-bindings'. Update Purpose after archive.

## Requirements

### Requirement: Playback copy typography controls are editor-backed

The system SHALL expose persisted editor controls for Sustainability English copy typography, Factory Circuit English copy typography, and Images lead copy typography. The playback runtime SHALL consume the resolved config values instead of relying only on page-local CSS hardcoded font size, line height, or letter spacing.

#### Scenario: Sustainability English copy uses resolved typography

- **GIVEN** the Sustainability display config sets copy typography with secondary font size `16`, line height `1.7`, and margin top `18`
- **WHEN** `/sustainability` renders from that config
- **THEN** the English copy block uses those resolved values
- **AND** the copy text content remains unchanged

#### Scenario: Factory English copy uses resolved typography

- **GIVEN** the Factory Circuit display config sets copy typography with secondary font size `20`, line height `1.6`, and margin top `20`
- **WHEN** `/factory-circuit` renders from that config
- **THEN** the English copy block uses those resolved values
- **AND** the Factory copy text remains page-configurable

#### Scenario: Images lead copy uses resolved typography

- **GIVEN** the Images display config sets copy font size `26`, line height `1.6`, and letter spacing `0.5`
- **WHEN** `/images` renders from that config
- **THEN** the lead copy block uses those resolved values


<!-- @trace
source: extend-typography-palette-and-fix-ornament-bindings
updated: 2026-06-07
code:
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/services/displayStoryService.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - data/server-runtime.lock.json
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - uploads/overview_bg-1.png
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - uploads/overview_bg-3.png
  - uploads/overview_bg-4.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
-->

---
### Requirement: Sustainability green palette tokens are editor-backed

The system SHALL expose persisted editor controls for Sustainability green palette tokens used by value, icon, and accent treatments. The playback runtime SHALL use resolved palette values rather than CSS-only hardcoded green values.

#### Scenario: Sustainability palette controls affect value and icon greens

- **GIVEN** the Sustainability display config sets `valueColor` to `#57774a` and `iconColor` to `#6a8a50`
- **WHEN** `/sustainability` renders KPI/stat cards and highlight values
- **THEN** those surfaces use the resolved palette values
- **AND** missing or invalid palette values fall back to seed values without blanking the page


<!-- @trace
source: extend-typography-palette-and-fix-ornament-bindings
updated: 2026-06-07
code:
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/services/displayStoryService.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - data/server-runtime.lock.json
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - uploads/overview_bg-1.png
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - uploads/overview_bg-3.png
  - uploads/overview_bg-4.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
-->

---
### Requirement: Factory KPI card typography is editor-backed

The system SHALL expose persisted editor controls for Factory Circuit KPI card title, subtitle, value, and unit sizing by reusing the existing `DisplayCardStyleConfig` model.

#### Scenario: Factory KPI card uses resolved card style

- **GIVEN** the Factory Circuit display config sets KPI `totalPower` value font size to `58`
- **WHEN** `/factory-circuit` renders the total power KPI
- **THEN** the KPI card uses the resolved card style value size
- **AND** the metric value still comes from the existing Factory runtime view model


<!-- @trace
source: extend-typography-palette-and-fix-ornament-bindings
updated: 2026-06-07
code:
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/services/displayStoryService.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - data/server-runtime.lock.json
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - uploads/overview_bg-1.png
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - uploads/overview_bg-3.png
  - uploads/overview_bg-4.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
-->

---
### Requirement: Leaf ornament opacity and rotation bindings match config

The system SHALL apply leaf ornament opacity and rotation directly from resolved display chrome config for Factory Circuit and Sustainability. The system SHALL NOT normalize Factory leaf opacity against the seed value.

#### Scenario: Factory leaf opacity equals configured opacity

- **GIVEN** the Factory Circuit seed config sets leaf opacity to `0.38`
- **WHEN** `/factory-circuit` renders the leaf watermark
- **THEN** the rendered style contains opacity `0.38`
- **AND** it does not divide the configured opacity by the seed opacity

#### Scenario: Sustainability leaf rotation comes from config

- **GIVEN** the Sustainability display config sets leaf rotation to `-28`
- **WHEN** `/sustainability` renders the leaf ornament
- **THEN** the rendered style sets `--display-leaf-rotation` to `-28deg`
- **AND** missing rotation falls back to the seed rotation

<!-- @trace
source: extend-typography-palette-and-fix-ornament-bindings
updated: 2026-06-07
code:
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/app/routeMeta.ts
  - apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts
  - packages/shared/src/displayEditorSchema.ts
  - packages/shared/src/displayPageMediaEffects.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/web/src/pages/Solar/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - apps/web/src/app/playbackRouteMeta.ts
  - apps/server/src/services/displayStoryService.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - apps/web/src/pages/Overview/index.tsx
  - docs/reference-match/fhd-closeout-handoff-2026-06-07.md
  - apps/web/src/pages/Images/images.css
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.ts
  - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - data/server-runtime.lock.json
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Sustainability/index.tsx
  - apps/web/src/pages/Sustainability/sustainability.css
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.ts
  - uploads/overview_bg-1.png
  - docs/reference-match/flow-connector-refinement-closeout-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/shared/displayPageMediaEffectConfig.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - uploads/overview_bg-3.png
  - uploads/overview_bg-4.png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
tests:
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx
  - apps/web/src/pages/displayPageMediaStyle.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/shared/displaySurfaceChrome.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - packages/shared/src/displayPageMediaEffects.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/shared/displayPageFlowTreatmentConfig.test.ts
  - apps/web/src/pages/Overview/cardVisibility.test.ts
-->