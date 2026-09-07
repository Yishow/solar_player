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

---
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

---
### Requirement: Local-day baselines are maintained per scope
<!-- requirement-id: E2-M1 -->

The consumption daily-summary baseline SHALL be persisted independently for each concrete metric scope and contributing physical meter revision/epoch. Local-day boundaries SHALL use `siteTimeZone` resolved from the server-verified E6 accounting profile revision and the normalized source observation instant. Restart, one site receiving a late first message, and another site crossing midnight SHALL NOT reset or substitute another baseline. Reassigning a source between site total and department SHALL create a new E6 profile revision without changing the E1 source revision, accepted samples or persisted baseline. Unknown baseline, reset or continuity gaps SHALL remain explicit rather than being clamped into a valid zero. Generation and other existing counter semantics SHALL remain unchanged by this consumption-specific extension.

#### Scenario: Independent midnight rollover
<!-- scenario-id: E2-M1-S01 -->

- **GIVEN** CL receives its first accepted reading after local midnight before KN
- **WHEN** CL daily consumption is processed
- **THEN** CL changes only its own period state and KN retains its independently persisted baseline

#### Scenario: Restart with consumption evidence
<!-- scenario-id: E2-M1-S02 -->

- **GIVEN** a valid consumption baseline and accepted observations exist in SQLite
- **WHEN** the server restarts in MQTT mode without a new message
- **THEN** it resumes the same period calculation and preserves the original source timestamps without inserting mock readings

#### Scenario: Unproven baseline
<!-- scenario-id: E2-M1-S03 -->

- **GIVEN** no eligible period-start observation exists for a meter
- **WHEN** the service creates a daily summary
- **THEN** the consumption result is unavailable or explicitly partial, never a valid zero or the current register

#### Scenario: Accounting reassignment preserves source state
<!-- scenario-id: E2-M1-S04 -->

- **GIVEN** a source has an accepted baseline and E1 source revision while an E6 profile assigns it to a department
- **WHEN** a new E6 profile revision assigns the same source to site total
- **THEN** only profile membership and profile revision change; the source revision, accepted observations and baseline remain unchanged

<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->