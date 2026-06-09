## ADDED Requirements

### Requirement: Overview generation trend reflects instantaneous generation power

The Overview generation trend series SHALL represent instantaneous generation power (the time-series of generation power readings), not cumulative generation energy, so the chart forms a daily solar profile (rising after sunrise, peaking around midday, falling toward sunset). The server SHALL persist instantaneous generation power into the metric snapshot history, and the Overview trend reader SHALL source the series from that instantaneous-power history. When instantaneous-power history is absent, the reader SHALL fall back to the existing stored series rather than failing.

#### Scenario: Trend series uses instantaneous generation power

- **WHEN** the server has recorded instantaneous generation power snapshots over a day
- **THEN** the Overview generation trend series reflects those instantaneous-power readings as a daily profile rather than a monotonically increasing cumulative total

##### Example: Noon peak comes from instantaneous power history

- **GIVEN** `metric_snapshots.generation_power` for one day reads `0.0, 0.4, 1.7, 3.9, 5.1, 3.2, 1.0, 0.0`
- **WHEN** `readOverviewGenerationTrendSeries` loads the latest 24 samples
- **THEN** the returned trend rises toward midday and falls afterward
- **AND** it does not render as a monotonically increasing cumulative curve

#### Scenario: Reader falls back when instantaneous-power history is absent

- **WHEN** no instantaneous generation power history is available
- **THEN** the Overview generation trend reader returns the previously stored series without raising an error

##### Example: Legacy history still renders a trend

- **GIVEN** the history table has legacy `generation` values but `generation_power` is null for all sampled rows
- **WHEN** the Overview trend reader resolves the series
- **THEN** it returns the legacy `generation` series
- **AND** the widget continues rendering a chart instead of failing

### Requirement: Development mock feed drives runtime metrics without bypassing the runtime path

In development mock mode (no real broker), the system SHALL feed simulated instantaneous metric readings into the runtime live-metrics store on an interval, so the standard accumulator and snapshot-writer pipeline produces the trend history from real runtime data. The simulated generation power SHALL follow a time-of-day solar profile. This mock feed SHALL run only in mock mode and SHALL NOT alter the production accumulator or snapshot-writer behavior.

#### Scenario: Mock feed populates runtime metrics in mock mode

- **WHEN** the server runs in mock mode
- **THEN** the system periodically writes simulated instantaneous readings into the runtime live-metrics store, and the trend history reflects a daily solar profile that updates over time

##### Example: Mock runtime path produces a solar bell curve

- **GIVEN** the server starts with `DATA_MODE=mock`
- **WHEN** the mock feed ticks through morning to midday samples
- **THEN** `live_metric_values.realTimePower` receives simulated instantaneous writes
- **AND** subsequent snapshots build a trend history with a noon peak and near-zero night values

#### Scenario: Mock feed is inactive outside mock mode

- **WHEN** the server runs in a non-mock data mode
- **THEN** the mock feed does not write simulated readings

##### Example: Production mode does not inject simulated metrics

- **GIVEN** the server starts with a real MQTT-backed data mode
- **WHEN** background services start
- **THEN** `MockMetricsFeedService` does not schedule interval writes
- **AND** only real runtime ingestion updates the live-metrics store
