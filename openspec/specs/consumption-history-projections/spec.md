# consumption-history-projections Specification

## Purpose

TBD - created by archiving change 'repair-consumption-history-projections'. Update Purpose after archive.

## Requirements

### Requirement: Consumers use one canonical period projection
<!-- requirement-id: E3-R1 -->

The history service SHALL expose canonical consumption period totals from the period resolver. Consumption trend, history and export consumers SHALL NOT sum cumulative snapshots or override a selected period with the live lifetime register. Existing raw snapshots SHALL retain their original semantics.

#### Scenario: Monthly trend ignores lifetime register
<!-- scenario-id: E3-R1-S01 -->

- **GIVEN** the live register is 100000 and the selected month resolves to 4300 kWh
- **WHEN** EnergyTrend renders the month range
- **THEN** the consumption card and export display 4300 kWh, not 100000 or the sum of snapshots

#### Scenario: Calendar year summary
<!-- scenario-id: E3-R1-S02 -->

- **GIVEN** the selected site year starts at local January 1
- **WHEN** year history is requested
- **THEN** the summary uses that calendar-year window and the same resolver as month/day

---
### Requirement: History APIs preserve scope and authorization
<!-- requirement-id: E3-R2 -->

Existing display history routes SHALL continue to derive site scope from authorized device context. Management history SHALL require trusted management access and an explicit allowed scope. API extensions SHALL expose period, timezone, quality and revision without reinterpreting existing raw snapshot fields.

#### Scenario: Display scope cannot be overridden
<!-- scenario-id: E3-R2-S01 -->

- **GIVEN** a CL display credential is used with a KN query attempt
- **WHEN** history is requested
- **THEN** the existing security policy rejects or ignores unauthorized override and never leaks KN data

#### Scenario: Management context
<!-- scenario-id: E3-R2-S02 -->

- **GIVEN** an authorized operator selects KN in the editor without a display credential
- **WHEN** the management history endpoint is called with metricScope=kn
- **THEN** KN results are returned through management authorization rather than impersonating a device

---
### Requirement: History repair is previewed versioned and reversible
<!-- requirement-id: E3-R3 -->

Historical repair SHALL require an explicit bounded scope and date range, run as dry-run before application, produce a diff and unreconstructable list, and stage a new revision before an atomic activation. It SHALL NOT mutate raw observations or reset physical counters.

#### Scenario: Idempotent repair
<!-- scenario-id: E3-R3-S01 -->

- **GIVEN** the same scope/range/input watermark/algorithm version is rebuilt twice
- **WHEN** the results are compared
- **THEN** the active totals and row counts are identical and no duplicate consumption is created

#### Scenario: Repair interrupted
<!-- scenario-id: E3-R3-S02 -->

- **GIVEN** a shadow rebuild fails before activation
- **WHEN** normal history is requested
- **THEN** the previous active revision remains readable and partial shadow output is not served

---
### Requirement: Unrecoverable history remains explicit
<!-- requirement-id: E3-R4 -->

A projection SHALL be reconstructed only from samples whose semantics, source timestamps and continuity can be established. Unknown baseline periods SHALL remain unavailable or partial; a zero or mock value SHALL NOT replace missing evidence.

#### Scenario: No January baseline
<!-- scenario-id: E3-R4-S01 -->

- **GIVEN** only September readings survive retention
- **WHEN** a full-year repair is requested
- **THEN** the year is listed as unreconstructable/partial and the system does not invent January usage

#### Scenario: Known endpoints but missing daily allocation
<!-- scenario-id: E3-R4-S02 -->

- **GIVEN** the full month delta is supported but internal days are not
- **WHEN** history is returned
- **THEN** the supported month total and explicit daily gaps coexist without forcing them to agree through fabricated points

---
### Requirement: Projection refresh follows source revisions
<!-- requirement-id: E3-R5 -->

Accepted late data and source-definition revisions SHALL invalidate only affected projections and caches. Activations SHALL compare source watermarks so an older computation cannot overwrite newer evidence. Required boundary and reset evidence SHALL survive retention.

#### Scenario: Late data corrects one day
<!-- scenario-id: E3-R5-S01 -->

- **GIVEN** a valid CL observation fills one missing CL midnight baseline
- **WHEN** recomputation completes
- **THEN** affected CL periods receive a new revision and KN periods do not change

#### Scenario: Stale recomputation races
<!-- scenario-id: E3-R5-S02 -->

- **GIVEN** job A starts before a newer sample used by job B
- **WHEN** A finishes after B
- **THEN** A cannot replace B active projection with an older watermark

---
### Requirement: Restart restores honest history states
<!-- requirement-id: E3-R6 -->

In MQTT mode a restart SHALL restore persisted canonical projections and their original observation freshness without requiring a new message. Mock generation SHALL remain restricted to stored mock mode. Recovery SHALL not reset the day baseline to server startup.

#### Scenario: Restart before a broker message
<!-- scenario-id: E3-R6-S01 -->

- **GIVEN** valid persisted daily and monthly projections exist and MQTT is disconnected
- **WHEN** the server restarts
- **THEN** the prior values remain available with stale/last-known state, not fresh invented data

#### Scenario: Mock mode remains explicit
<!-- scenario-id: E3-R6-S02 -->

- **GIVEN** stored mode is mqtt
- **WHEN** history cannot be reconstructed
- **THEN** no mock feed or mock consumption is substituted

---
### Requirement: Period metrics have explicit catalog identities
<!-- requirement-id: E3-R7 -->

The effective server catalog SHALL expose consumption.period.dayKwh, consumption.period.monthKwh and consumption.period.yearKwh as owned period-energy metrics for CL/KN and authorized inherited site resolution. The consumptionEnergy register SHALL retain cumulative-energy semantics. Editor preview and runtime SHALL resolve the new entries through the canonical period service.

#### Scenario: Bind month consumption
<!-- scenario-id: E3-R7-S01 -->

- **GIVEN** a supported energy-period card selects consumption.period.monthKwh for KN
- **WHEN** preview and runtime resolve it
- **THEN** both use KN calendar-month consumption and never the raw consumptionEnergy register

#### Scenario: Protect period identity
<!-- scenario-id: E3-R7-S02 -->

- **GIVEN** a generic MQTT mapping attempts to claim a server-owned consumption.period key
- **WHEN** the mapping is saved
- **THEN** the server rejects the ownership conflict

---
### Requirement: Site projections resolve the authoritative accounting profile
<!-- requirement-id: E3-R8 -->

The period/history API SHALL resolve the E6 profile siteTotal for site-level consumption and preserve profile revision/effective-time attribution. Department-sum or a custom comparison denominator SHALL NOT overwrite site totals. Closed-history remapping SHALL require the existing explicit dry-run and activation process.

#### Scenario: Denominator changed
<!-- scenario-id: E3-R8-S01 -->

- **GIVEN** KN changes its share basis from main to department-sum without changing siteTotal
- **WHEN** the overview history endpoint is read
- **THEN** site total remains unchanged and the comparison-only change is not applied to history

#### Scenario: Profile crosses a period
<!-- scenario-id: E3-R8-S02 -->

- **GIVEN** siteTotal membership changed after month start
- **WHEN** month-to-date is requested
- **THEN** the response includes revision boundaries and honest partial/segmented quality, rather than applying the newest membership to all historical observations

---
### Requirement: Daily history overlays preserve requested range semantics
<!-- requirement-id: E3-R9 -->

Adding canonical consumption data to a daily-summary response SHALL preserve the requested day, week, month, year or total range, its established date-selection semantics, and non-consumption fields. A current-month consumption curve SHALL NOT replace every range with the current month's date keys. Site scope SHALL continue to come from the authorized request context. Missing consumption evidence SHALL remain null rather than an unrelated value or a fabricated zero.

#### Scenario: R7 year includes an earlier month
<!-- scenario-id: E3-R9-S01 -->

- **WHEN** a year-range request includes summary dates in January and September and the site has an active energy profile
- **THEN** the response retains the eligible January and September records and their generation, carbon and other summary fields instead of returning only September

#### Scenario: R7 day and week remain bounded
<!-- scenario-id: E3-R9-S02 -->

- **WHEN** day and week requests are made at a month boundary with an active profile
- **THEN** their date sets follow the requested ranges, including eligible previous-month dates for the week, without adding an entire current month

#### Scenario: R7 month and total remain compatible
<!-- scenario-id: E3-R9-S03 -->

- **WHEN** month and total responses are compared before and after enabling a structurally valid profile
- **THEN** enabling the profile does not truncate either requested range or remove non-consumption data; consumption additions identify missing evidence honestly

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