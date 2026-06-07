# overview-dashboard-widgets Specification

## Purpose

TBD - created by archiving change 'extend-overview-dashboard-widgets'. Update Purpose after archive.

## Requirements

### Requirement: Overview generation trend widget renders from runtime data

The system SHALL provide an optional Overview generation trend widget that renders only from runtime-provided trend data (the existing metrics history / view model trend series). The widget SHALL NOT render trend data from mock fixtures. When no runtime trend data is available, the widget SHALL render an empty state rather than mock content.

#### Scenario: Generation trend widget renders runtime series

- **WHEN** the Overview generation trend widget is enabled and the view model provides a non-empty trend series
- **THEN** the widget renders the trend using that runtime series

##### Example: Widget renders runtime power trend

- **GIVEN** the Overview view model exposes trend series `[82, 95, 101, 108]`
- **WHEN** the generation trend widget is rendered
- **THEN** the widget shows the runtime start and latest values from that series
- **AND** it does not use `apps/web/src/mocks/metrics.ts` trend fixtures

#### Scenario: Generation trend widget shows empty state without data

- **WHEN** the Overview generation trend widget is enabled and no runtime trend data is available
- **THEN** the widget renders an empty state and does not render mock trend content

##### Example: Widget renders empty trend state

- **GIVEN** the Overview view model exposes no trend series
- **WHEN** the generation trend widget is rendered
- **THEN** the widget shows an empty state message
- **AND** it does not render fallback/mock trend values


<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Overview alert notifications widget renders from existing alert sources

The system SHALL provide an optional Overview alert notifications widget that lists recent alerts from existing runtime alert sources (display story alert tone and reason, device readiness findings). The widget SHALL NOT render alert items from mock fixtures. When there are no alerts, the widget SHALL render an empty state indicating no alerts.

#### Scenario: Alert widget lists runtime alerts

- **WHEN** the Overview alert notifications widget is enabled and runtime alert sources report one or more alerts
- **THEN** the widget lists those alerts from the runtime sources

##### Example: Widget lists story and readiness alerts

- **GIVEN** the Overview story reports `todayGeneration` with `fallbackReason` `metric-unavailable`
- **AND** display readiness reports a blocking `realTimePower` finding for Overview
- **WHEN** the alert notifications widget is rendered
- **THEN** the widget lists both runtime-derived alert items
- **AND** it does not render mock alert copy

#### Scenario: Alert widget shows empty state without alerts

- **WHEN** the Overview alert notifications widget is enabled and runtime alert sources report no alerts
- **THEN** the widget renders an empty state indicating no alerts

##### Example: Widget renders no-alert state

- **GIVEN** the Overview story summary is normal
- **AND** display readiness reports no blocking or warning findings for Overview
- **WHEN** the alert notifications widget is rendered
- **THEN** the widget shows `無警示`


<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->

---
### Requirement: Dashboard widgets are editable regions that default to hidden

Each Overview dashboard widget SHALL be registered as an editable region exposing geometry and a visibility toggle, and SHALL default to not visible in the seed configuration. When a widget's visibility is not enabled, the playback runtime SHALL NOT render that widget. A widget configuration that omits visibility SHALL be treated as hidden for dashboard widgets.

#### Scenario: Widget hidden by default is not rendered

- **WHEN** the Overview seed configuration is used without enabling a dashboard widget
- **THEN** the playback runtime does not render that widget

##### Example: Seed keeps optional widgets off

- **GIVEN** the Overview seed config has dashboard widget visibility omitted or `false`
- **WHEN** the Overview playback runtime resolves the config
- **THEN** the generation trend widget and alert notifications widget are not rendered

#### Scenario: Enabled widget renders after publish

- **WHEN** an operator enables a dashboard widget's visibility in the editor and publishes the draft
- **THEN** the playback runtime renders that widget

##### Example: Operator enables the generation trend widget

- **GIVEN** the Overview seed has the generation trend widget with visibility defaulting to off
- **WHEN** the operator turns the widget's visibility toggle on and publishes
- **THEN** the Overview playback output includes the generation trend widget
- **AND** turning the toggle back off and publishing removes it from playback

<!-- @trace
source: extend-overview-dashboard-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - apps/web/src/pages/Overview/viewModel.ts
  - uploads/overview_bg-2.png
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - data/server-runtime.lock.json
  - uploads/overview_bg-3.png
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - uploads/overview_bg-1.png
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/hooks/useOverviewWeather.ts
  - uploads/overview_bg-4.png
tests:
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
-->