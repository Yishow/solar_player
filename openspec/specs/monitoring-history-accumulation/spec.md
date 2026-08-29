# monitoring-history-accumulation Specification

## Purpose

TBD - created by archiving change 'fix-overview-trend-accumulation'. Update Purpose after archive.

## Requirements

### Requirement: Monitoring counters and daily summaries accumulate continuously

The monitoring history pipeline SHALL keep mock cumulative energy readings non-decreasing across updates and local-day boundaries. The daily summary service SHALL persist the current local day's deltas while the service is running and SHALL resume the same day's persisted deltas after a service restart.
Mock readings SHALL only be produced when the stored data mode is `mock`. In MQTT mode, a server restart SHALL restore persisted cumulative counters, current-day daily summaries, and current-day generation trend snapshots without requiring a new MQTT message and SHALL NOT substitute mock readings.

#### Scenario: Mock cumulative readings advance within and across days

- **WHEN** the mock feed produces readings at two increasing times on one local day and then on the next local day
- **THEN** cumulative generation, consumption, and self-consumption SHALL NOT decrease between readings

##### Example: Day boundary remains cumulative

- **GIVEN** mock readings are produced at 2026-06-09 12:00, 2026-06-09 13:00, and 2026-06-10 12:00 local time
- **WHEN** their cumulative energy values are compared chronologically
- **THEN** each later cumulative value is greater than or equal to its preceding value

#### Scenario: Current-day summary updates before day rollover

- **WHEN** cumulative counters increase during one local day and the daily summary service processes the new counters
- **THEN** the row for that local date SHALL be inserted or updated with the delta from the day baseline

##### Example: Same-day counters produce a visible summary

- **GIVEN** the day baseline has generation 12 kWh and consumption 4 kWh
- **AND** current counters have generation 15 kWh and consumption 5 kWh
- **WHEN** the service processes the current day
- **THEN** the current-day summary contains generation 3 kWh and consumption 1 kWh

#### Scenario: Current-day summary resumes after restart

- **WHEN** a service starts on a date that already has a persisted daily summary and cumulative counters continue increasing
- **THEN** the service SHALL restore the day baseline from the persisted summary and SHALL extend rather than replace the existing daily totals

#### Scenario: MQTT mode restores persisted Overview data before a new message

- **WHEN** the server starts in MQTT mode with persisted cumulative counters, a current-day daily summary, and current-day metric snapshots but the broker has not delivered a new message
- **THEN** Overview SHALL expose the persisted cumulative values, monthly-consumption point, and current-day generation trend
- **AND** the server SHALL NOT start or read the mock metrics feed

<!-- @trace
source: fix-overview-trend-accumulation
updated: 2026-07-16
code:
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
tests:
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
-->

### Requirement: Monitoring history accumulation is partitioned by metric scope

The monitoring history pipeline SHALL accumulate and restore site-dependent snapshots, daily summaries, and cumulative counters independently for `cl` and `kn`. Explicit cross-site aggregates SHALL be persisted under `global` and MUST NOT overwrite or replace either site's history.

#### Scenario: CL and KN counters advance independently
- **WHEN** CL generation advances while KN generation is unchanged
- **THEN** the CL cumulative and current-day history advance for `cl`
- **AND** the KN cumulative and current-day history remain unchanged

#### Scenario: Server restarts in MQTT mode
- **WHEN** the server starts with persisted CL, KN, and global monitoring history but no new broker message has arrived
- **THEN** the server restores each scope independently
- **AND** a CL playback request reads the persisted CL history without requiring a KN or global row to substitute for it

### Requirement: Local-day baselines are maintained per scope

Daily-summary baseline state SHALL be tracked independently for each metric scope so one site's first update or day rollover does not reset another site's accumulated daily delta.

#### Scenario: CL receives its first update after midnight before KN
- **WHEN** the local date changes and CL receives a new cumulative reading before KN
- **THEN** the CL day baseline rolls over for CL only
- **AND** the persisted KN baseline remains available until KN is processed for that date
