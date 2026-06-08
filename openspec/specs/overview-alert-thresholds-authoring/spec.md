# overview-alert-thresholds-authoring Specification

## Purpose

TBD - created by archiving change 'add-overview-kpi-footers-and-widget-details'. Update Purpose after archive.

## Requirements

### Requirement: Author Overview Alert Threshold Widget Visibility

The system SHALL allow an operator to configure whether to always show threshold rules (`alwaysShowThresholds`) on the Alert Notifications widget. The display page editor SHALL expose a toggle field linked to this property in the inspector. When `alwaysShowThresholds` is true, the widget SHALL render the status and thresholds of the four core monitoring rules (Real-time Power, Inverter Temperature, Grid Voltage, and Communication Interruption) as active list items.

#### Scenario: Normal state shows core rules

- **GIVEN** `alwaysShowThresholds` is enabled and the current live alerts list is empty
- **WHEN** the Alert Notifications widget is rendered
- **THEN** the widget shows the four core rules with normal status indicators instead of an empty state placeholder

### Requirement: Refine Lower Dashboard Widgets Appearance

The system SHALL layout the humidity, wind speed, and rain amount sub-indicators horizontally on the Weather widget using flex row layout. The system SHALL render the Generation Trend widget trend line as an area sparkline with a green gradient fading to transparent. The Generation Trend widget SHALL also statically render time range tabs (Today, 7D, 30D) and refresh options on its header to match the reference design.

#### Scenario: Weather sub-indicators render in row layout

- **GIVEN** weather sub-indicators are rendered
- **WHEN** the widget is styled
- **THEN** it resolves to a horizontal flex layout with space-between positioning

#### Scenario: Generation trend renders area chart

- **GIVEN** trend data is available
- **WHEN** the Generation Trend widget is rendered
- **THEN** the trend line resolves to an area sparkline with gradient styling


<!-- @trace
source: add-overview-kpi-footers-and-widget-details
updated: 2026-06-08
code:
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx
  - apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.tsx
tests:
  - apps/web/src/pages/Overview/displayPageConfig.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/WeatherCardWidget.test.tsx
  - apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx
-->