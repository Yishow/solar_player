## ADDED Requirements

### Requirement: Period consumption is a counter difference
<!-- requirement-id: E2-R1 -->

For a continuous cumulative-energy meter epoch, the resolver SHALL calculate period consumption as the normalized end reading minus the normalized start reading. It SHALL NOT sum register observations or use a lifetime register as a day, month or year total. Multi-meter totals SHALL sum eligible per-meter deltas without overlapping membership.

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

### Requirement: Calendar boundaries use explicit site time
<!-- requirement-id: E2-R2 -->

The resolver SHALL use the configured IANA site time zone for day, calendar month and calendar year boundaries, and SHALL accept an injected clock. Completed periods SHALL be non-overlapping half-open intervals while counter endpoint observations may be shared by adjacent periods.

#### Scenario: Taipei month boundary
<!-- scenario-id: E2-R2-S01 -->

- **GIVEN** the site time zone is Asia/Taipei
- **WHEN** the September 2026 month start is resolved
- **THEN** the start instant is 2026-08-31T16:00:00Z regardless of the host time zone

#### Scenario: Leap day and year rollover
<!-- scenario-id: E2-R2-S02 -->

- **GIVEN** samples exist at February 29 and March 1 in leap year 2028, and at a year boundary
- **WHEN** period windows are enumerated
- **THEN** February has 29 daily buckets and an endpoint is never counted as energy twice

### Requirement: Boundary estimation is bounded and disclosed
<!-- requirement-id: E2-R3 -->

The resolver SHALL prefer exact boundary observations. An approved last observation before a boundary MAY be used only within the configured boundaryMaxAgeSeconds and SHALL produce estimated-boundary quality, actual sample timestamps and offsets. A post-start reading SHALL NOT fabricate the missing start baseline.

#### Scenario: Bounded prior sample
<!-- scenario-id: E2-R3-S01 -->

- **GIVEN** a start sample is 20 seconds before midnight and boundaryMaxAgeSeconds is 300
- **WHEN** a later endpoint is available
- **THEN** the delta is returned with estimated-boundary quality and a -20 second start offset

#### Scenario: Missing month start
<!-- scenario-id: E2-R3-S02 -->

- **GIVEN** the first available reading is at September 10 noon
- **WHEN** September consumption is requested
- **THEN** the full month-to-date value is null; only separately labeled observed partial consumption may be returned

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

### Requirement: Counter discontinuities require explicit evidence
<!-- requirement-id: E2-R5 -->

A decrease SHALL be invalid unless an explicit reset, replacement or configured rollover contract explains it. Unknown negative deltas SHALL NOT be clamped to zero or made positive. Verified continuous segments MAY be summed; unknown segments SHALL make the full period partial.

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

### Requirement: Period quality and precision survive calculation
<!-- requirement-id: E2-R8 -->

The resolver SHALL preserve decimal precision until presentation and SHALL expose quality, freshness, actual coverage, contributing samples and calculation version. Stale values SHALL NOT become current merely because a poll or HTTP request occurred.

#### Scenario: Decimal preservation
<!-- scenario-id: E2-R8-S01 -->

- **GIVEN** the start is 1000000000000.125 and the end is 1000000000000.375 kWh
- **WHEN** the resolver subtracts
- **THEN** the result is exactly 0.250 kWh before display rounding

#### Scenario: Repeated stale snapshot
<!-- scenario-id: E2-R8-S02 -->

- **GIVEN** no new observation arrives for a source beyond its freshness threshold
- **WHEN** the service is polled repeatedly
- **THEN** sample freshness remains stale and no new boundary observation is invented
