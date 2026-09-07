# monitoring-history-accumulation Specification

## Purpose

TBD - created by archiving change 'fix-overview-trend-accumulation'. Update Purpose after archive.

## Requirements

### Requirement: Monitoring counters and daily summaries accumulate continuously
<!-- requirement-id: E3-M1 -->

The monitoring pipeline SHALL keep mock cumulative generation, consumption and self-consumption readings non-decreasing across updates and configured local-day boundaries. Mock readings SHALL only be produced when the stored data mode is mock. In MQTT mode, restart SHALL restore persisted counters, current-day summaries and current-day generation snapshots without requiring a new broker message and without substituting mock readings. For consumption, current-day and selected calendar-period results SHALL be projections of accepted meter observations through the canonical counter-difference resolver, not sums of register snapshots. Restored data SHALL retain its observation timestamps, coverage and quality. Missing start evidence or invalid continuity SHALL NOT become a valid zero. Other existing generation/self-consumption/CO2 calculation semantics SHALL remain unchanged.

#### Scenario: Mock counters across dates
<!-- scenario-id: E3-M1-S01 -->

- **GIVEN** the stored data mode is mock and readings are produced on one local day and the next
- **WHEN** the readings are compared in source-time order
- **THEN** each cumulative generation, consumption and self-consumption value is non-decreasing

#### Scenario: Current-day summary before rollover
<!-- scenario-id: E3-M1-S02 -->

- **GIVEN** valid day baselines are generation 12 kWh and consumption 4 kWh and current counters are 15 and 5
- **WHEN** the pipeline processes the current day
- **THEN** the current-day summary exposes generation 3 and consumption 1 kWh

#### Scenario: Restart extends same-day consumption
<!-- scenario-id: E3-M1-S03 -->

- **GIVEN** accepted meter evidence and a same-day persisted consumption projection exist
- **WHEN** the server restarts and receives a later valid reading
- **THEN** the same-day total is extended from its original baseline, not replaced by a new baseline at startup

#### Scenario: MQTT restoration before a new message
<!-- scenario-id: E3-M1-S04 -->

- **GIVEN** persisted counters, a current-day summary and generation snapshots exist in MQTT mode
- **WHEN** the broker has not yet sent a new message after restart
- **THEN** the saved values and monthly chart point remain readable with truthful age and quality, and no mock feed starts

#### Scenario: Incomplete history repair
<!-- scenario-id: E3-M1-S05 -->

- **GIVEN** only mid-month cumulative observations exist
- **WHEN** the month projection is rebuilt
- **THEN** the full month total stays null and any observed partial delta is separately labeled

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
