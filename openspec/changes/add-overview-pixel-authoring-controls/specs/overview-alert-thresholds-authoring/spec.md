## ADDED Requirements

### Requirement: Author Overview Alert Threshold Widget Visibility

The system SHALL allow an operator to configure whether to always show threshold rules (`alwaysShowThresholds`) on the Alert Notifications widget. The display page editor SHALL expose a toggle field linked to this property in the inspector. When `alwaysShowThresholds` is true, the widget SHALL render the status and thresholds of the four core monitoring rules (Real-time Power, Inverter Temperature, Grid Voltage, and Communication Interruption) as active list items, showing they are normal when no live alerts exist.

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