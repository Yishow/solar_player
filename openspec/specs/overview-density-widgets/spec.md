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

The three-phase power table SHALL render R, S, and T rows, each with voltage, current, and power columns, reading values from the existing live metrics channel, and SHALL NOT add a new data source.

#### Scenario: Phase metrics available

- **WHEN** the live metrics snapshot exposes the voltage, current, and power readings for a phase
- **THEN** that phase row displays the corresponding values

#### Scenario: Phase metrics missing

- **WHEN** a phase reading is absent from the live metrics snapshot
- **THEN** that column displays a seed fallback placeholder and SHALL NOT display NaN or undefined


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