# overview-density-widgets Specification

## Purpose

TBD - created by archiving change 'add-overview-density-widgets'. Update Purpose after archive.

## Requirements

### Requirement: Render editor-maintainable Overview density widgets
<!-- requirement-id: E4-M1 -->

The Overview display page SHALL render the weather card, monthly-consumption widget and generation-trend widget through the existing dashboard widget configuration. The monthly-consumption widget SHALL preserve its existing phasePower configuration identity for compatibility. Authoring, draft persistence, publication and runtime rendering SHALL resolve the same widget geometry, visibility and style. This requirement SHALL NOT introduce a page-local hardcoded configuration or a monetary quotation widget.

#### Scenario: Default Overview widgets
<!-- scenario-id: E4-M1-S01 -->

- **GIVEN** Overview uses the seed configuration
- **WHEN** the display page renders
- **THEN** the weather card, monthly consumption curve and generation trend remain available alongside the hero and KPI cards

#### Scenario: Saved widget configuration
<!-- scenario-id: E4-M1-S02 -->

- **GIVEN** an operator changes the existing phasePower widget geometry or visibility in the editor
- **WHEN** the draft is saved and published
- **THEN** the runtime uses the same configuration without a renamed or orphaned widget identity

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
<!-- requirement-id: E4-M2 -->

The legacy-named phasePower widget SHALL render the current calendar month daily consumption with title 月用量曲線 and subtitle Monthly Consumption. Device playback SHALL read the authorized daily-summary endpoint /api/metrics/daily-summary?range=month, while management preview SHALL use its authorized explicit-scope history contract without impersonating a device. The widget SHALL validate finite values, sort dates chronologically, preserve zero observations, exclude future dates and display unavailable dates as gaps. Smooth filled-area segments and layered gradient styling SHALL only connect adjacent eligible daily points, not bridge missing dates. A single valid point SHALL remain visible. The widget SHALL refresh for applicable monitoring-history events and discard stale responses from previous scopes or revisions. API failure, unavailable baseline and empty history SHALL be distinguishable, with no fabricated mock values, NaN, fixed percentages or unsupported currency values.

#### Scenario: Daily values in the current month
<!-- scenario-id: E4-M2-S01 -->

- **GIVEN** the API returns descending valid values [3400,3300,2900,3200,3100] for adjacent dates
- **WHEN** the chart builds chronological data
- **THEN** the series is [3100,3200,2900,3300,3400]

#### Scenario: Valid zero and missing date
<!-- scenario-id: E4-M2-S02 -->

- **GIVEN** September 1 has 0 kWh, September 2 is unknown and September 3 has 80 kWh
- **WHEN** the month chart renders
- **THEN** September 1 remains a real zero and the line does not bridge the missing September 2 interval

#### Scenario: Current-day refresh
<!-- scenario-id: E4-M2-S03 -->

- **GIVEN** the widget is mounted for KN
- **WHEN** a matching monitoring-history event signals a newer revision
- **THEN** the widget fetches KN history again and displays the new current-day value

#### Scenario: Unauthorized management preview
<!-- scenario-id: E4-M2-S04 -->

- **GIVEN** a management editor lacks device credentials but has authorized KN management access
- **WHEN** it previews monthly consumption
- **THEN** it reads KN through the management history contract without removing playback authentication

#### Scenario: No valid consumption data
<!-- scenario-id: E4-M2-S05 -->

- **GIVEN** the API fails or no eligible daily values exist
- **WHEN** the widget resolves its state
- **THEN** it displays the specific error or empty/baseline message without a fabricated chart

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
