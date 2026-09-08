# period-consumption-deltas Specification

## Purpose

TBD - created by archiving change 'fix-period-consumption-deltas'. Update Purpose after archive.

## Requirements

### Requirement: Period consumption is a counter difference
<!-- requirement-id: E2-R1 -->

For a continuous cumulative-energy meter epoch, the resolver SHALL calculate period consumption as the normalized end reading minus the normalized start reading. It SHALL NOT sum register observations or use a lifetime register as a day, month or year total. The resolver SHALL obtain accounting membership from a server-verified E6 profile revision; caller-supplied `meterIds` SHALL select only physical channels already validated within that revision and SHALL NOT assign site-total or department ownership. Multi-meter totals SHALL sum eligible per-meter deltas without overlapping profile membership.

#### Scenario: Daily monthly yearly example
<!-- scenario-id: E2-R1-S01 -->

- **GIVEN** year-start=1000, month-start=5000, day-start=9000 and latest=9300 kWh for one uninterrupted meter
- **WHEN** the resolver calculates the three to-date periods
- **THEN** day=300, month=4300 and year=8300 kWh; none equals the register 9300

#### Scenario: Duplicate observations
<!-- scenario-id: E2-R1-S02 -->

- **GIVEN** register observations 10000,10100,10100,10250 share a period with valid endpoints
- **WHEN** the period is resolved
- **THEN** consumption is 250 kWh, not 40450 kWh and not 350 kWh


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Calendar boundaries use explicit site time
<!-- requirement-id: E2-R2 -->

For this resolver, `definitionRevision` SHALL identify a server-resolved collection of E1 `{channelId, meterId, sourceRevision, epochId}` references in the concrete request scope, rather than a derived-formula revision. Operators SHALL NOT be required to enter or select these versions. Review-time source checks SHALL NOT substitute latest source revisions for historical period evidence.

The resolver SHALL use `siteTimeZone` from a server-verified E6 accounting profile revision as the sole authority for day, calendar month and calendar year boundaries, and SHALL accept an injected clock. The request SHALL retain `metricScope`, `meterIds` and `definitionRevision`, and SHALL identify `profileRevision`, period selection and `asOf`; it SHALL reject caller-supplied `timeZone`, `start` or `end` overrides. E1 SHALL normalize source timestamps to UTC instants before ingestion into this resolver; E2 SHALL consume the normalized instant and SHALL preserve E1 `SOURCE_TIMESTAMP_INVALID` diagnostics without creating a second timestamp parser. A source time zone different from the profile time zone is valid after instant normalization. Completed periods SHALL be non-overlapping half-open intervals while counter endpoint observations SHALL be shared by adjacent periods when they are boundary endpoints.

For E6 draft preview only, the internal calculator seam SHALL resolve the same calendar contract from an immutable server-validated E6 review snapshot bound to the expected persisted profile and source revisions. The result SHALL identify its review context and SHALL NOT be stored as production history or presented as a persisted profile revision. Public callers SHALL NOT provide an arbitrary draft timezone through this seam.

#### Scenario: Taipei month boundary
<!-- scenario-id: E2-R2-S01 -->

- **GIVEN** the site time zone is Asia/Taipei
- **WHEN** the September 2026 month start is resolved using a server-verified profile revision
- **THEN** the start instant is 2026-08-31T16:00:00Z regardless of the host time zone

#### Scenario: Leap day and year rollover
<!-- scenario-id: E2-R2-S02 -->

- **GIVEN** samples exist at February 29 and March 1 in leap year 2028, and at a year boundary
- **WHEN** period windows are enumerated
- **THEN** February has 29 daily buckets and an endpoint is never counted as energy twice

#### Scenario: Source and profile time zones differ
<!-- scenario-id: E2-R2-S03 -->

- **GIVEN** E1 accepts a source no-offset timestamp `2026-08-31 16:00:00` with `sourceTimestampTimeZone=UTC` and provides normalized instant `2026-08-31T16:00:00Z`, while the server-verified profile has `siteTimeZone=Asia/Taipei`
- **WHEN** September 2026 consumption is resolved
- **THEN** E2 assigns the normalized instant to the profile month boundary using Asia/Taipei, without reparsing the raw timestamp or using the host time zone

#### Scenario: Calendar override or unknown profile is rejected
<!-- scenario-id: E2-R2-S04 -->

- **GIVEN** a caller supplies `timeZone`, `start` or `end`, names an unknown profile revision, or supplies a meterId outside the requested profile membership
- **WHEN** period consumption is requested
- **THEN** the server returns a stable override, profile-revision or membership error and produces no period result

#### Scenario: Draft calendar preview uses the reviewed snapshot
<!-- scenario-id: E2-R2-S05 -->

- **GIVEN** the saved profile uses Asia/Taipei and an E6 server-validated draft proposes UTC in an immutable review snapshot bound to that saved revision
- **WHEN** the E6 calculator seam previews September 2026
- **THEN** preview uses 2026-09-01T00:00:00Z as its month start and identifies the review context, while the saved profile and its 2026-08-31T16:00:00Z boundary remain unchanged with no production history/cache writes


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Boundary estimation is bounded and disclosed
<!-- requirement-id: E2-R3 -->

The resolver SHALL prefer exact boundary observations. An approved last observation before a boundary SHALL be used only within the configured boundaryMaxAgeSeconds and SHALL produce estimated-boundary quality, actual sample timestamps and offsets. A post-start reading SHALL NOT fabricate the missing start baseline.

#### Scenario: Bounded prior sample
<!-- scenario-id: E2-R3-S01 -->

- **GIVEN** a start sample is 20 seconds before midnight and boundaryMaxAgeSeconds is 300
- **WHEN** a later endpoint is available
- **THEN** the delta is returned with estimated-boundary quality and a -20 second start offset

#### Scenario: Missing month start
<!-- scenario-id: E2-R3-S02 -->

- **GIVEN** the first available reading is at September 10 noon
- **WHEN** September consumption is requested
- **THEN** the full month-to-date value is null; any returned observed partial consumption SHALL be separately labeled

#### Scenario: Receive-time estimate cannot be exact
<!-- scenario-id: E2-R3-S03 -->

- **GIVEN** E1 accepts an approved `retain=false`, `dup=false` packet with complete QoS evidence and no source timestamp as `timestampQuality=receive-time-estimated`, while a `retain=true` timestamp-free replay is not accepted
- **WHEN** the resolver uses the accepted packet near a period boundary
- **THEN** the accepted packet can contribute only as a bounded `estimated-boundary` sample based on `receivedAt`, even at the exact boundary; the retained replay cannot update accepted history, baseline or freshness


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Zero and missing observations are not interchangeable
<!-- requirement-id: E2-R4 -->

The resolver SHALL distinguish exact zero consumption from unavailable, partial or invalid results. One accepted observation SHALL establish a baseline only. A missing day SHALL remain missing, without zero filling or interpolation.

#### Scenario: Idle meter
<!-- scenario-id: E2-R4-S01 -->

- **GIVEN** valid start and end registers both read 10000 kWh
- **WHEN** the period is calculated
- **THEN** valueKwh is 0 with valid quality

#### Scenario: Only one observation
<!-- scenario-id: E2-R4-S02 -->

- **GIVEN** only one cumulative observation exists
- **WHEN** the period is calculated
- **THEN** valueKwh is null and the issue explains the missing endpoint or baseline


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Counter discontinuities require explicit evidence
<!-- requirement-id: E2-R5 -->

A decrease SHALL be invalid unless an explicit reset, replacement or configured rollover contract explains it. Unknown negative deltas SHALL NOT be clamped to zero or made positive. The resolver SHALL sum only verified continuous segments; unknown segments SHALL make the full period partial.

#### Scenario: Unknown decrease
<!-- scenario-id: E2-R5-S01 -->

- **GIVEN** a register falls from 1200 to 10 without an event
- **WHEN** the resolver processes it
- **THEN** the result is invalid, not 0, 10, 1190 or 1210

#### Scenario: Verified rollover
<!-- scenario-id: E2-R5-S02 -->

- **GIVEN** the exclusive counter modulus is 100000 and observations are 99990 then 20
- **WHEN** a single plausible rollover is validated
- **THEN** consumption is 30 kWh with rollover provenance

#### Scenario: Reset with missing closing read
<!-- scenario-id: E2-R5-S03 -->

- **GIVEN** an operator confirms replacement but no old-meter closing observation exists
- **WHEN** a period spans replacement
- **THEN** the full value is null/partial and known segment values remain labeled as partial


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Restart and late data preserve the same event-time result
<!-- requirement-id: E2-R6 -->

The resolver SHALL use persisted samples and revisions, not service start time, as its calculation basis. Replaying samples, restarting at midday or receiving older valid samples SHALL produce deterministic results and SHALL NOT alter other sites.

#### Scenario: Midday restart
<!-- scenario-id: E2-R6-S01 -->

- **GIVEN** day baseline=10000 and latest=10250 were persisted
- **WHEN** the server restarts and later receives 10300
- **THEN** the same day totals 300 kWh, not 50 kWh

#### Scenario: Late cross-midnight sample
<!-- scenario-id: E2-R6-S02 -->

- **GIVEN** an observation from 23:59 arrives after a 00:01 observation
- **WHEN** the event is accepted after validation
- **THEN** the applicable earlier period is recomputed by source time and the newest live observation does not move backward


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Period totals and daily allocation carry independent coverage
<!-- requirement-id: E2-R7 -->

The resolver SHALL distinguish known whole-period energy from unknown allocation within that period. It SHALL calculate a whole-month delta from valid month endpoints even when a multi-day gap prevents daily allocation, and SHALL expose the daily coverage separately.

#### Scenario: Known month endpoints and daily gap
<!-- scenario-id: E2-R7-S01 -->

- **GIVEN** month-start and month-end registers are 10000 and 16000 but two internal midnight baselines are missing
- **WHEN** month and daily views are resolved
- **THEN** month energy is 6000 kWh while affected daily buckets remain gaps; the sum of known days is not falsely labeled the complete month

#### Scenario: No second differencing
<!-- scenario-id: E2-R7-S02 -->

- **GIVEN** an upstream channel is declared interval-energy and reports an already calculated daily 100 kWh interval
- **WHEN** it is included in an eligible aggregate
- **THEN** 100 kWh is used once; no difference is taken between consecutive daily totals


<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Period quality and precision survive calculation
<!-- requirement-id: E2-R8 -->

The resolver SHALL preserve decimal precision until presentation and SHALL expose quality, freshness, actual coverage, contributing samples, calculation version and provenance for the server-verified profile revision and site time zone. Stale values SHALL NOT become current merely because a poll or HTTP request occurred.

#### Scenario: Decimal preservation
<!-- scenario-id: E2-R8-S01 -->

- **GIVEN** the start is 1000000000000.125 and the end is 1000000000000.375 kWh
- **WHEN** the resolver subtracts
- **THEN** the result is exactly 0.250 kWh before display rounding

#### Scenario: Repeated stale snapshot
<!-- scenario-id: E2-R8-S02 -->

- **GIVEN** no new observation arrives for a source beyond its freshness threshold
- **WHEN** the service is polled repeatedly
- **THEN** sample freshness remains stale, the profile revision and site time zone remain in provenance, and no new boundary observation is invented

<!-- @trace
source: fix-period-consumption-deltas
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Daily coverage uses admissible time-bounded period evidence
<!-- requirement-id: E2-R9 -->

Monthly dailyCoverage SHALL count only completed daily windows supported by eligible energy evidence no later than the request's asOf instant. Each counted day SHALL obey the same boundary-age, source identity, revision, epoch, measurement-kind and discontinuity rules as its daily consumption calculation. Input ordering SHALL NOT change coverage. Whole-month consumption and its daily allocation coverage SHALL remain independent facts.

#### Scenario: R8 meter replacement does not prove a covered day
<!-- scenario-id: E2-R9-S01 -->

- **WHEN** a day opens with one meter epoch and closes with a replacement epoch without reviewed continuity evidence
- **THEN** the daily result remains partial or unavailable and that day is excluded from coveredDays even when both timestamps are close to the calendar boundaries

#### Scenario: R8 later stored samples cannot inflate historical coverage
<!-- scenario-id: E2-R9-S02 -->

- **WHEN** a September result is requested as of September 10 while the database already contains valid samples through September 30
- **THEN** days ending after the asOf instant do not count as covered, while totalDays continues to describe the calendar month's length

#### Scenario: R8 ordering and invalid resets are handled consistently
<!-- scenario-id: E2-R9-S03 -->

- **WHEN** the same samples arrive in a different input order or a daily interval contains an unexplained cumulative decrease
- **THEN** reordering does not change coverage and the invalid-reset day is not counted as covered

#### Scenario: R8 known month endpoints coexist with daily gaps
<!-- scenario-id: E2-R9-S04 -->

- **WHEN** valid continuous month endpoints establish 1000 kWh but intermediate daily boundaries are missing
- **THEN** the month can report 1000 kWh with incomplete daily coverage without inventing daily allocations

<!-- @trace
source: fix-energy-period-consumer-consistency
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

<!-- @trace
source: fix-energy-period-consumer-consistency
updated: 2026-09-08
code:
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/services/periodConsumptionService.ts
  - packages/shared/src/freshnessPolicy.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/services/departmentSharesService.ts
  - packages/shared/src/periodConsumption.ts
tests:
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/services/departmentSharesService.test.ts
  - packages/shared/src/periodConsumption.test.ts
-->