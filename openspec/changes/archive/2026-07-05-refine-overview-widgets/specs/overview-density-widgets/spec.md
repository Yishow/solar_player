## MODIFIED Requirements

### Requirement: Render three-phase power from existing metric channel with fallback

The three-phase power table SHALL be replaced by a monthly consumption curve widget that renders daily power consumption over the past 30 days. The widget SHALL display a title of "月用量曲線" and a subtitle of "Monthly Consumption". The chart SHALL render a smooth filled area curve (a smoothed path rather than angular straight segments) with a layered gradient fill. It SHALL fetch daily summaries from the metrics daily summary API endpoint `/api/metrics/daily-summary?range=month` when available, and reverse the data to draw chronologically. When historical data is unavailable or empty, it SHALL render a mock daily consumption trend of 30 points and SHALL NOT display NaN or empty values.

#### Scenario: Monthly consumption data available from API

- **WHEN** the daily-summary API returns historical consumption data for the past 30 days
- **THEN** the monthly consumption widget renders the trend curve based on the returned data chronologically

##### Example: Rendering API consumption data

- **GIVEN** the daily-summary API returns a list of daily summaries with consumption values `[3100, 3200, 2900, 3300, 3400]`
- **WHEN** the monthly consumption widget mounts and queries the API
- **THEN** the widget renders a smooth curve with 5 points representing the values chronologically (from oldest to newest)

#### Scenario: Monthly consumption data unavailable or empty

- **WHEN** the daily-summary API fails or returns no data
- **THEN** the monthly consumption widget renders a fallback mock daily consumption trend curve of 30 data points

##### Example: Falling back to mock data

- **GIVEN** the daily-summary API returns an empty array or fails
- **WHEN** the monthly consumption widget renders
- **THEN** the widget does not crash
- **AND** it renders a smooth curve using a default mock array of 30 daily consumption values
