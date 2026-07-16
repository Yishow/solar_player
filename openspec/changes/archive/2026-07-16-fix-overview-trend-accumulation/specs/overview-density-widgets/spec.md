## MODIFIED Requirements

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
