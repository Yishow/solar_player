## MODIFIED Requirements

### Requirement: Expose monitoring snapshot day diagnostics from Data Source Settings
The system SHALL expose current-day monitoring snapshot diagnostics from the Data Hub diagnostics/monitoring surface for an explicit selected metric scope so operators can tell whether that scope's Overview trend data belongs to today. An all-scope management view MAY summarize multiple scopes, but each reported day/count/anomaly MUST remain attributable to its scope.

#### Scenario: Current day has no snapshots yet
- **WHEN** the monitoring diagnostics payload is requested for CL after local midnight and no current-day CL snapshot has been persisted yet
- **THEN** the payload SHALL report that CL has no current local-day monitoring snapshots
- **AND** it SHALL identify the latest available CL snapshot day when one exists
- **AND** current KN or global snapshots SHALL NOT make the CL result appear populated

#### Scenario: Snapshot timing looks suspicious
- **WHEN** the diagnostics payload detects snapshot timestamps for the selected scope that are inconsistent with expected current-day timing
- **THEN** the payload SHALL include one or more scope-attributed anomaly messages for the operator
- **AND** the page SHALL render those messages without hiding the rest of the diagnostics

### Requirement: Reset today trend clears only current-day monitoring snapshots
The system SHALL provide a Data Hub monitoring operation that clears only the current local day's `metric_snapshots` for one explicitly selected metric scope used by the Overview trend. The normal reset action MUST NOT clear CL, KN, and global snapshots together through an implicit all-scope default.

#### Scenario: Operator resets today trend
- **WHEN** an operator invokes the reset-today-trend operation for `metricScope = cl`
- **THEN** the system SHALL delete only CL `metric_snapshots` rows whose timestamp falls on the current local day
- **AND** it SHALL leave KN/global `metric_snapshots`, `live_metric_values`, `daily_energy_summaries`, and `cumulative_counters` unchanged
- **AND** it SHALL emit a `monitoring-history` refresh signal identifying `cl`

#### Scenario: Reset runs when there is nothing to clear
- **WHEN** an operator invokes the reset-today-trend operation for a selected scope and that scope has no matching current-day `metric_snapshots` rows
- **THEN** the operation SHALL succeed
- **AND** it SHALL report that zero rows were deleted for that scope

#### Scenario: Operator requests a destructive all-scope reset
- **WHEN** management offers an all-scope reset operation
- **THEN** it SHALL be a separately explicit destructive action that identifies every affected scope before execution
- **AND** the single-scope reset endpoint/action SHALL NOT interpret a missing scope as `all`
