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

This contract SHALL apply to both management energy-history responses and display daily-summary responses. For the same authorized site, date, profile evidence and as-of instant, each response SHALL expose the same canonical daily consumption and quality. Existing legacy consumption summary values SHALL NOT override that result when a site has an accounting profile. Generation, carbon, self-consumption, peak values and raw observations SHALL retain their existing meanings. History charts and tables SHALL consume canonical daily values rather than the superseded legacy values.

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

#### Scenario: N3 management and display agree despite a legacy sentinel

- **GIVEN** eligible readings establish 300 kWh for a KN calendar day and its legacy summary contains consumption 9999 and generation 10
- **WHEN** authorized management and paired KN display clients request that day through their respective history APIs using the same evidence and as-of instant
- **THEN** both report daily consumption 300 with matching quality, preserve generation 10, and leave the stored legacy row unchanged
- **AND** management history's chart and table render 300 rather than 9999

#### Scenario: N3 new null summaries do not hide supported consumption

- **GIVEN** a site's daily summary has null consumption but accepted evidence establishes a usable daily delta
- **WHEN** management history is returned
- **THEN** the daily value comes from that evidence and remains available independently of the old summary column

#### Scenario: N3 month total remains independent of daily gaps

- **GIVEN** valid month endpoints establish a complete month delta but one intermediate daily baseline is absent
- **WHEN** management cards, charts and tables consume the history response
- **THEN** the supported month total remains visible while the affected daily value remains null with its diagnostic quality, even if a legacy row has a non-null sentinel
- **AND** neither a fabricated daily allocation nor a sum of only known days is presented as the complete month

#### Scenario: N3 authorization and compatibility remain unchanged

- **WHEN** a client requests another site's data without the required authority, or a supported global or no-profile history path is requested
- **THEN** the former retains the existing denial or authorized-scope behavior, while the latter retains its established non-profile history semantics without being assigned a fake site profile


<!-- @trace
source: fix-energy-history-range-projections
updated: 2026-09-08
code:
  - apps/server/src/services/profileReadinessService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - packages/shared/src/periodConsumption.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/services/departmentSharesService.ts
tests:
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - packages/shared/src/periodConsumption.test.ts
  - apps/server/src/services/departmentSharesService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->

---
### Requirement: Canonical consumption preserves the requested history span

For a site with an accounting profile, the canonical consumption result SHALL describe the requested history span, its actual start, end, calculated-through instant, applicable profile evidence and quality. A total-range result SHALL NOT silently use the current calendar year's start. A week-range result SHALL preserve the existing recent-seven-date selection semantics rather than redefine the request as a Monday-start calendar week. Range calculation SHALL use the authoritative site calendar and a single as-of instant, preserving the existing boundary, source-revision and continuity safeguards.

A total-range numeric result SHALL be available only for an explicitly identifiable, supported accounting span. Its lower bound SHALL NOT be inferred to be installation inception merely because one old reading survived. When the full requested span or its opening evidence cannot be established, the result SHALL expose null with partial or unavailable quality and a reason instead of a year-to-date substitute. Verified cross-year continuity SHALL NOT be discarded solely because a year boundary occurred.

#### Scenario: N4 total is not the current year

- **GIVEN** an explicitly known accounting span begins on 2025-01-01 in Asia/Taipei, the same cumulative source has supported readings 1000 at that start, 1600 at 2026-01-01, and 1900 at the request's 2026-09-02 endpoint, and no profile or source discontinuity intervenes
- **WHEN** year and total history are requested
- **THEN** year consumption is 300 and supported total-span consumption is 900, with different reported start instants and the same endpoint

#### Scenario: N4 unknown cumulative beginning stays explicit

- **GIVEN** the source has a usable current-year baseline but the requested cumulative beginning or its baseline cannot be established
- **WHEN** total history is requested
- **THEN** the total result is partial or unavailable with null value and an explanatory reason, not a relabeled current-year number or raw lifetime register

#### Scenario: N4 a week crosses a month boundary

- **GIVEN** the requested recent-seven-date interval crosses a month boundary and has valid, continuous boundary evidence
- **WHEN** week history is requested
- **THEN** consumption uses the entire requested interval and reports that interval, without dropping previous-month usage or returning the current month instead

#### Scenario: N4 department shares resolve the same span as the site total

- **WHEN** week or total department shares and the site consumption total are requested for the same authorized site and as-of instant
- **THEN** both report the same period start, end and quality, rather than one of them silently returning an empty share set or a calendar-year window

#### Scenario: N4 discontinuous range cannot be declared complete

- **WHEN** a week or total span crosses an unproven source replacement, reset or accounting-profile boundary
- **THEN** the result retains the relevant boundary evidence and honest partial or unavailable quality rather than summing incompatible registers into an exact total


<!-- @trace
source: fix-energy-history-range-projections
updated: 2026-09-08
code:
  - apps/server/src/services/profileReadinessService.ts
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - packages/shared/src/periodConsumption.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/metrics-history.ts
  - apps/server/src/services/departmentSharesService.ts
tests:
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - packages/shared/src/periodConsumption.test.ts
  - apps/server/src/services/departmentSharesService.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
-->

---
### Requirement: Canonical unavailable results do not trigger legacy consumption fallback

For an existing site accounting profile, missing evidence, unsupported calculations and calculation errors SHALL remain distinguishable from the absence of a configured profile. Energy-history and energy-trend consumers SHALL NOT substitute legacy counters, legacy summary consumption, or zero for a canonical unavailable result. A known measured zero SHALL remain distinguishable from no supported measurement. Existing global and no-profile compatibility paths SHALL remain explicitly separate.

After the persisted-period resolver has established a configured profile, a day, month or year calculation failure or projection-read failure SHALL return a non-null canonical result with quality `unavailable` and valueKwh `null`. Its diagnostics SHALL identify the requested range and SHALL NOT expose raw exception messages, SQL or stack traces. Constructing this failure result SHALL NOT require an additional database read. A failure to determine whether a profile exists SHALL NOT be reclassified as an absent profile; existing API error handling SHALL remain in force.

#### Scenario: N4 missing week evidence is not zero

- **GIVEN** a configured site has no supported week delta and its legacy summaries contain only null consumption or unrelated numeric sentinels
- **WHEN** management history or trend renders the week selection
- **THEN** consumption is displayed as unavailable with its quality or reason, not zero and not a legacy sentinel

#### Scenario: N4 measured zero remains valid

- **GIVEN** two distinct eligible boundary observations prove a continuous requested-span delta of zero
- **WHEN** the consumption card is rendered
- **THEN** it displays zero as a measured result rather than treating it as unavailable

#### Scenario: Configured calendar calculation fails

- **GIVEN** a readable configured site profile and legacy consumption of 987654.321
- **WHEN** the day, month or year calculation fails after profile lookup
- **THEN** each range SHALL return a non-null canonical unavailable result with null valueKwh and an UNRESOLVED_ACCOUNTING_PERIOD diagnostic naming that range
- **AND** history and trend consumers SHALL NOT display 987654.321 or a substituted zero as canonical consumption

#### Scenario: Projection read fails after a calendar calculation

- **GIVEN** a configured site, a successful calculation and a failing active-projection read
- **WHEN** the persisted-period resolver handles the failure
- **THEN** it SHALL return the same unavailable contract without retrying the failed database to assemble diagnostics
- **AND** a history API response whose other reads succeed SHALL preserve that canonical result in periodSummary

#### Scenario: Failure diagnostics remain bounded and non-sensitive

- **WHEN** a configured calendar failure has no code, a nonconforming code, or a code longer than 64 characters
- **THEN** the result SHALL carry PERIOD_CONSUMPTION_RESOLUTION_FAILED in addition to its range diagnostic
- **AND** a 1-to-64-character uppercase alphanumeric or underscore code SHALL be preserved instead of the generic cause
- **AND** raw messages, SQL and stack traces SHALL NOT appear in either case

#### Scenario: Missing profile and unreadable profile remain different

- **WHEN** a supported site has no configured profile or the request uses the existing global compatibility scope
- **THEN** the established compatibility result SHALL remain unchanged
- **WHEN** the profile lookup instead fails
- **THEN** the failure SHALL follow existing API error handling and SHALL NOT become a successful no-profile compatibility result


<!-- @trace
source: fix-calendar-consumption-unavailable-results
updated: 2026-09-10
code:
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/server/src/services/periodConsumptionService.ts
tests:
  - apps/server/src/routes/metrics-history.test.ts
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
-->

---
### Requirement: Long-range history stays computable as evidence accumulates

Resolving consumption for a set of dates SHALL NOT cost work proportional to the number of dates multiplied by the site's whole accepted-sample history. A request that covers a long span SHALL remain answerable on a site whose accepted readings have accumulated over years, without the response time growing with that accumulation for every date it reports.

Making the calculation cheaper SHALL NOT change what it reports. For the same site, evidence, profile and as-of instant, every resolved value, quality, issue, boundary record and coverage figure SHALL be identical to the result the same inputs produced before, including for rollover, interval-energy, source-replacement, epoch-change and receive-time-estimated evidence.

#### Scenario: Adding dates does not re-read the whole history for each one

- **GIVEN** a site whose accepted readings span years and a request covering a year of dates
- **WHEN** the daily consumption points are resolved
- **THEN** the sample-level work grows with the evidence each date's own window contains, not with the whole history once per date

#### Scenario: Cheaper resolution reports exactly what it reported before

- **GIVEN** any set of accepted samples, meters, profile and as-of instant
- **WHEN** a day, month, year, week or accounting-span result is resolved
- **THEN** its value, quality, issues, boundary records, sample identifiers and coverage match the result the same inputs produced before the change

#### Scenario: Window boundaries keep their half-open meaning

- **GIVEN** samples that fall exactly on a window's start instant, exactly on its end instant, and one millisecond either side of each
- **WHEN** the window is resolved
- **THEN** the sample on the start instant is inside the window, the sample on the end instant is not, and the reported opening and closing evidence is unchanged

<!-- @trace
source: bound-long-range-history-recompute
updated: 2026-09-08
code:
  - packages/shared/src/periodConsumption.ts
tests:
  - packages/shared/src/periodConsumption.test.ts
-->

---
### Requirement: Accounting reads select a bounded evidence closure

Persisted period, multi-date history and projection-fingerprint reads SHALL select evidence by the requested scope, member channels, effective profile context, windows and existing as-of eligibility mode instead of materializing all accepted readings of the site. Selection SHALL preserve the full meter identity comprising metricScope, meterId, channelId, sourceRevision and epochId. It SHALL retain the opening and closing observations, equal-instant ties and intervening observations needed to reproduce continuity, reset, source-revision and freshness diagnostics. A stale baseline SHALL NOT be discarded merely because it precedes the requested window.

Calculation evidence and projection-fingerprint evidence SHALL retain their existing distinct inclusion and ordering rules. Timestamp eligibility, receive-time-estimated precedence, half-open contribution windows, late-arriving evidence and draft-preview receive cutoffs SHALL remain unchanged. Adding unrelated historical or other-channel readings SHALL NOT increase the materialized evidence of an unchanged request whose required evidence closure is unchanged.

#### Scenario: Unrelated accumulated history does not enlarge selected evidence

- **GIVEN** fixed requested channels, a fixed month, unchanged required baselines and continuity evidence, and 10,000 unrelated old accepted readings
- **WHEN** unrelated old readings grow to 100,000 without changing that evidence closure
- **THEN** the selected row identities and materialized row count SHALL remain unchanged
- **AND** query-plan inspection SHALL demonstrate bounded index-assisted access instead of an unbounded accepted-reading load

#### Scenario: A prior baseline retains intervening source changes

- **GIVEN** the closing identity has an opening observation before the window and other source revisions or epochs occur between that opening and the closing
- **WHEN** the selector constructs calculation evidence
- **THEN** it SHALL preserve every intervening observation required by the full-load resolver to produce the same issues, boundary identifiers and quality
- **AND** it SHALL NOT restrict selection to the currently configured source identity

#### Scenario: End boundaries and receive cutoffs remain distinct

- **GIVEN** observations at start, end and one millisecond on either side, equal-instant ties, a receive-time-estimated observation and a late-arriving source-timestamp observation
- **WHEN** the same inputs are resolved using bounded selection
- **THEN** opening and closing evidence SHALL match the full-load reference
- **AND** interval-energy contributions SHALL retain their half-open window
- **AND** persisted-history late-arrival eligibility and draft-preview receivedAt cutoff SHALL each retain their existing behavior


<!-- @trace
source: bound-accounting-evidence-window-reads
updated: 2026-09-10
code:
  - apps/server/src/services/accountingEvidenceSelection.ts
  - apps/server/src/services/meterReadingService.ts
  - apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql
  - apps/server/src/services/consumptionProjectionService.ts
  - apps/server/src/services/periodConsumptionService.ts
tests:
  - apps/server/src/services/accountingEvidenceSelection.test.ts
  - apps/server/src/services/consumptionProjectionService.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/server/src/services/meterReadingService.test.ts
-->

---
### Requirement: Projection evidence reuse preserves transaction-time invalidation

A request-local immutable evidence selection SHALL support checksum and watermark computation without duplicate evidence reads for the same selection. Candidate creation SHALL verify current input evidence. Activation SHALL independently re-read the fingerprint evidence inside its immediate transaction and SHALL preserve active-pointer compare-and-swap, input checksum and watermark checks. A request-local snapshot SHALL NOT replace transaction-time validation.

#### Scenario: One snapshot serves checksum and watermark

- **WHEN** checksum and watermark are computed for the same request-local projection selection
- **THEN** they SHALL reuse one selected row set and preserve the original fingerprint field ordering and reading-id ordering
- **AND** query instrumentation SHALL show one evidence selection rather than one per derived value

#### Scenario: A relevant late observation blocks stale activation

- **GIVEN** a shadow candidate and a subsequently accepted observation that changes its fingerprint evidence
- **WHEN** activation begins
- **THEN** the transaction SHALL select fresh evidence, reject the candidate with PROJECTION_INPUT_CHANGED and leave active pointers unchanged

#### Scenario: Future observations do not invalidate an earlier projection

- **GIVEN** a shadow candidate and a new observation after its calculatedThrough that does not change any eligible baseline
- **WHEN** activation checks its fingerprint
- **THEN** that future observation SHALL NOT change the candidate's input checksum or cause an input-change conflict


<!-- @trace
source: bound-accounting-evidence-window-reads
updated: 2026-09-10
code:
  - apps/server/src/services/accountingEvidenceSelection.ts
  - apps/server/src/services/meterReadingService.ts
  - apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql
  - apps/server/src/services/consumptionProjectionService.ts
  - apps/server/src/services/periodConsumptionService.ts
tests:
  - apps/server/src/services/accountingEvidenceSelection.test.ts
  - apps/server/src/services/consumptionProjectionService.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/server/src/services/meterReadingService.test.ts
-->

---
### Requirement: Bounded accounting reads prove equivalent results and measurable work

The bounded-read implementation SHALL provide a reproducible differential fixture suite against the existing full-load calculation path and a fixed-seed capacity comparison. For identical inputs, values, quality, ordered issues, boundary records, sample identifiers, coverage, freshness and precision SHALL be identical. Validation SHALL include query counts, materialized row counts, query plans, memory measurements and repeated latency measurements; measurements SHALL NOT be represented as production capacity acceptance.

#### Scenario: Adversarial accounting fixtures remain equivalent

- **WHEN** day, month, year, week, total and multi-date cases cover measured zero, missing and stale baselines, resets, rollover, interval energy, replacement meters, source revisions, epochs, late arrivals and profile boundaries
- **THEN** bounded and full-load results SHALL be deeply equal field by field, including unavailable diagnostics

#### Scenario: A year of dates does not restore per-date full-history reads

- **WHEN** a request resolves a year of daily points
- **THEN** it SHALL reuse request-selected evidence and the existing shared sample-index behavior
- **AND** query instrumentation SHALL show no full-site accepted-reading load repeated for each date

#### Scenario: Capacity results have a reproducible comparison boundary

- **WHEN** the fixed dataset is measured before and after optimization
- **THEN** the report SHALL identify dataset seed and size, runtime environment, one warm-up, seven measured runs, query and row counts, memory observations and median and p95 latency
- **AND** unchanged evidence-row budgets and differential results SHALL be required gates independently of timing noise

<!-- @trace
source: bound-accounting-evidence-window-reads
updated: 2026-09-10
code:
  - apps/server/src/services/accountingEvidenceSelection.ts
  - apps/server/src/services/meterReadingService.ts
  - apps/server/src/db/migrations/052_accounting_evidence_query_indexes.sql
  - apps/server/src/services/consumptionProjectionService.ts
  - apps/server/src/services/periodConsumptionService.ts
tests:
  - apps/server/src/services/accountingEvidenceSelection.test.ts
  - apps/server/src/services/consumptionProjectionService.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/server/src/services/meterReadingService.test.ts
-->
