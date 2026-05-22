## ADDED Requirements

### Requirement: Overview KPI trend renders only from runtime data

The Overview KPI cards SHALL render a trend sparkline only from runtime-provided trend data exposed by the view model. The cards SHALL NOT render trend data sourced from mock fixtures.

#### Scenario: Runtime trend series renders a sparkline

- **WHEN** the view model provides a non-empty `trendSeries` for a KPI metric
- **THEN** that KPI card SHALL render a sparkline using the runtime `trendSeries`

#### Scenario: Mock trend data is not used

- **WHEN** the Overview page renders
- **THEN** it SHALL NOT import or render the mock `trendSeries` fixture for KPI sparklines

### Requirement: Missing runtime trend hides the sparkline

When the view model does not provide a trend series for a KPI metric, the Overview card SHALL omit the sparkline rather than display fabricated data.

#### Scenario: No runtime trend omits the sparkline

- **WHEN** a KPI metric has no `trendSeries` (undefined or empty)
- **THEN** the Overview card SHALL NOT render a sparkline for that metric
