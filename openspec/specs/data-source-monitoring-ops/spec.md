# data-source-monitoring-ops Specification

## Purpose

TBD - created by archiving change 'fix-mqtt-save-and-overview-trend-ops'. Update Purpose after archive.

## Requirements

### Requirement: Expose monitoring snapshot day diagnostics from Data Source Settings
The system SHALL expose current-day monitoring snapshot diagnostics from the Data Source operations surface so operators can tell whether Overview trend data belongs to today.

#### Scenario: Current day has no snapshots yet
- **WHEN** the Data Source diagnostics payload is requested after local midnight and no current-day snapshot has been persisted yet
- **THEN** the payload SHALL report that the current local day has no monitoring snapshots
- **AND** it SHALL identify the latest available snapshot day when one exists

#### Scenario: Snapshot timing looks suspicious
- **WHEN** the diagnostics payload detects snapshot timestamps that are inconsistent with expected current-day timing
- **THEN** the payload SHALL include one or more anomaly messages for the operator
- **AND** the page SHALL render those messages without hiding the rest of the diagnostics


<!-- @trace
source: fix-mqtt-save-and-overview-trend-ops
updated: 2026-06-29
code:
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/data-source.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
-->

---
### Requirement: Reset today trend clears only current-day monitoring snapshots
The system SHALL provide a Data Source operation that clears only the current local day's monitoring snapshots used by the Overview trend.

#### Scenario: Operator resets today trend
- **WHEN** an operator invokes the reset-today-trend operation
- **THEN** the system SHALL delete only `metric_snapshots` rows whose timestamp falls on the current local day
- **AND** it SHALL leave `live_metric_values`, `daily_energy_summaries`, and `cumulative_counters` unchanged
- **AND** it SHALL emit a `monitoring-history` refresh signal

#### Scenario: Reset runs when there is nothing to clear
- **WHEN** an operator invokes the reset-today-trend operation and the current local day has no matching `metric_snapshots` rows
- **THEN** the operation SHALL succeed
- **AND** it SHALL report that zero rows were deleted

<!-- @trace
source: fix-mqtt-save-and-overview-trend-ops
updated: 2026-06-29
code:
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/routes/data-source.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/server/src/routes/settings-mqtt.ts
tests:
  - apps/server/src/routes/data-source.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
-->