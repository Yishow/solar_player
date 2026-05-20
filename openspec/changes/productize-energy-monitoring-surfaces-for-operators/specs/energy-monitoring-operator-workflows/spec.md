## ADDED Requirements

### Requirement: Expose freshness and source state on energy monitoring surfaces

The system SHALL expose freshness and source state on `Energy Trend` and `Energy History` so operators can tell whether the visible values are live, historical, cumulative, stale, or degraded.

#### Scenario: Monitoring surface renders degraded data

- **WHEN** a monitoring surface must render without a fully fresh upstream source
- **THEN** the page SHALL identify the degraded or stale state explicitly
- **AND** it SHALL distinguish the current source role instead of presenting the values as fully fresh live data

##### Example: Trend page falls back to stale cumulative telemetry

- **GIVEN** the live MQTT feed has stopped updating but the last cumulative telemetry snapshot is still available
- **WHEN** the operator opens `Energy Trend`
- **THEN** the page labels the visible values as stale or degraded
- **AND** it distinguishes that the chart is rendering from cumulative fallback data instead of fully live values

### Requirement: Keep empty and degraded monitoring states consistent across trend and history

The system SHALL keep empty, error, and degraded monitoring semantics consistent across `Energy Trend` and `Energy History`.

#### Scenario: No usable history is available

- **WHEN** the monitoring surface lacks usable data for the selected range or source role
- **THEN** the page SHALL show a clear empty or degraded state
- **AND** the same state category SHALL mean the same thing on both energy monitoring pages

##### Example: History page has no annual records for the selected source

- **GIVEN** the operator selects a year and source role that have no persisted history rows
- **WHEN** `Energy History` loads that range
- **THEN** the page shows the shared empty or degraded state instead of a misleading zero-filled summary
- **AND** the same state category matches what `Energy Trend` would show for the same missing dataset condition
