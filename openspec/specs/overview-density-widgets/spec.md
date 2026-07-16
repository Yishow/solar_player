# overview-density-widgets Specification

## Purpose

TBD - created by archiving change 'add-overview-density-widgets'. Update Purpose after archive.

## Requirements

### Requirement: Render editor-maintainable Overview density widgets

The `Overview` display page SHALL render a weather card, a three-phase power table, and a filled-area generation trend widget through the existing Overview dashboard widget mechanism, so that authoring, draft persistence, publishing, and runtime rendering all resolve the same widget configuration.

#### Scenario: Default runtime shows density widgets

- **WHEN** `/overview` renders with no explicit config and resolves the seed configuration
- **THEN** the weather card, three-phase power table, and filled-area generation trend widget are visible alongside the hero and KPI cards

#### Scenario: Editor region and visibility persist to runtime

- **WHEN** an operator adjusts a density widget's region or visibility in `/display-pages/editor`, saves the draft, and publishes
- **THEN** the published `/overview` runtime renders that widget with the same region and visibility


<!-- @trace
source: add-overview-density-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/viewModel.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
-->

---
### Requirement: Bind weather card to the existing weather contract

The weather card SHALL derive its values from the existing weather current snapshot contract and SHALL NOT introduce a new weather data source.

#### Scenario: Weather data available

- **WHEN** the weather snapshot is fresh and exposes weather description, temperature, humidity, and observation time
- **THEN** the weather card displays those values

#### Scenario: Weather data unavailable

- **WHEN** the weather snapshot fetch state is not fresh or required fields are null
- **THEN** the weather card displays an explicit fallback message and SHALL NOT display null or empty values


<!-- @trace
source: add-overview-density-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/viewModel.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
-->

---
### Requirement: Render three-phase power from existing metric channel with fallback

The three-phase power table SHALL be replaced by a monthly consumption curve widget that renders daily power consumption over the current month. The widget SHALL display a title of "月用量曲線" and a subtitle of "Monthly Consumption". The chart SHALL render a smooth filled area curve with a layered gradient fill. It SHALL fetch daily summaries from `/api/metrics/daily-summary?range=month`, reverse the returned descending rows to draw chronologically, and refresh after a `monitoring-history` display sync event. When historical data is unavailable or empty, it SHALL render the existing empty state and SHALL NOT fabricate mock values, NaN, or empty chart points.

#### Scenario: Monthly consumption data available from API

- **WHEN** the daily-summary API returns current-month consumption summaries
- **THEN** the monthly consumption widget renders the daily values chronologically

##### Example: Rendering API consumption data

- **GIVEN** the API returns descending daily values `[3400, 3300, 2900, 3200, 3100]`
- **WHEN** the monthly consumption widget resolves the response
- **THEN** the curve contains `[3100, 3200, 2900, 3300, 3400]` from oldest to newest

#### Scenario: Current-day summary refreshes an open widget

- **WHEN** the widget is mounted and receives a `monitoring-history` display sync event
- **THEN** it SHALL fetch the month daily-summary API again and render the latest daily values

#### Scenario: Monthly consumption data unavailable or empty

- **WHEN** the daily-summary API fails or returns no valid consumption values
- **THEN** the monthly consumption widget SHALL render the existing empty state without a chart or fabricated values


<!-- @trace
source: fix-overview-trend-accumulation
updated: 2026-07-16
code:
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
-->

---
### Requirement: Preserve Overview architecture and scope boundaries

The change SHALL extend only the Overview widget configuration, view model projection, and rendering, and SHALL NOT modify navigation, routing, server APIs, the SQLite schema, or the MQTT connection architecture.

#### Scenario: No architectural surface change

- **WHEN** the density widgets are added
- **THEN** the bottom navigation composition, route structure, server API surface, and database schema remain unchanged

#### Scenario: No page-local hardcode bypass

- **WHEN** a density widget requires configuration
- **THEN** the configuration is expressed through the shared widget config and editor inspector, not a page-local hardcoded value that bypasses the editor

<!-- @trace
source: add-overview-density-widgets
updated: 2026-06-07
code:
  - apps/web/src/pages/Overview/viewModel.ts
  - docs/reference-match/phase4-visual-witness-2026-06-07.md
  - apps/web/src/pages/Overview/layout.ts
  - docs/reference-match/overview-density-baseline-2026-06-07.md
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
  - data/server-runtime.lock.json
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - docs/reference/Better/01.Overivew (大).png
  - apps/web/src/hooks/useOverviewWeather.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/shared/displayCardStyleConfig.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
tests:
  - apps/web/src/pages/Overview/densityWidgets.test.ts
  - apps/web/src/pages/displayPageChromeConfig.test.ts
  - apps/web/src/pages/Overview/widgets/GenerationTrendArea.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
  - apps/web/src/pages/displayPageCardStyleConfig.test.ts
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/style.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/layout.test.ts
-->
