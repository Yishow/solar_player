## ADDED Requirements

### Requirement: Daily reports carry complete period evidence rather than meter baselines
<!-- requirement-id: EPR-R1 -->

A daily engineering report SHALL identify site, engineeringId, publisherId, schemaVersion, definitionRevision, measurementKind=interval-energy, unit=kWh, exact decimal value, periodStart, periodEnd, periodStatus, coverage, quality, dataRevision and publishedAt. Its half-open period SHALL equal adjacent local midnights in the approved effective site calendar and resolve to UTC instants. A final complete valid report SHALL represent that day directly without two counter baselines. Arbitrary intervals, future completed periods, invalid timestamps and unapproved calendar changes SHALL be rejected. Zero SHALL be valid; missing or withdrawn values SHALL be null with a reason, not zero.

#### Scenario: Report delivered the next day
<!-- scenario-id: EPR-R1-S01 -->

- **GIVEN** the approved report covers September 15 and is published September 16
- **WHEN** it is admitted
- **THEN** the result belongs to September 15, not the received date

#### Scenario: A single complete report
<!-- scenario-id: EPR-R1-S02 -->

- **GIVEN** one final complete valid daily report contains 100 kWh
- **WHEN** that day is read
- **THEN** the day can be complete without waiting for a second cumulative observation

#### Scenario: Malformed interval
<!-- scenario-id: EPR-R1-S03 -->

- **GIVEN** periodEnd precedes periodStart or the period spans only half a site day
- **WHEN** daily validation runs
- **THEN** it rejects the daily record without estimating or prorating a whole day

#### Scenario: True zero
<!-- scenario-id: EPR-R1-S04 -->

- **GIVEN** a complete valid day explicitly reports value 0
- **WHEN** the day is calculated
- **THEN** zero is accepted and differs from an absent or withdrawn result

### Requirement: Business identity and data revisions govern duplicate correction and withdrawal
<!-- requirement-id: EPR-R2 -->

The business identity SHALL be site, engineeringId, measurement kind and normalized period start/end instants. PublisherId, receive time, definitionRevision and dataRevision SHALL not split one period into separately additive reports. Admission SHALL verify effective authority and definition before version comparison. Same dataRevision with semantically identical content SHALL be a duplicate; same revision with different content SHALL be a conflict. An authorized higher revision SHALL replace the current complete snapshot while retaining prior revisions and a correction reason; a lower revision SHALL never rewind current state. Missing intermediate revisions MAY be accepted only as complete replacement snapshots and SHALL be audited. Withdrawal SHALL use a higher revision with null value and reason; restoration SHALL also require a higher revision.

#### Scenario: Ten repeats including restart
<!-- scenario-id: EPR-R2-S01 -->

- **GIVEN** one report revision was committed
- **WHEN** it is sent ten times including after restart and with dup=false
- **THEN** one effective report remains and no extra energy is created

#### Scenario: Conflicting same revision
<!-- scenario-id: EPR-R2-S02 -->

- **GIVEN** revision 2 says 100 and another revision 2 says 120 for the same period
- **WHEN** the second arrives
- **THEN** it is quarantined as conflict and 100 remains effective

#### Scenario: Higher then lower revisions
<!-- scenario-id: EPR-R2-S03 -->

- **GIVEN** revision 3 replaces 100 with 120 using a reason
- **WHEN** revision 2 arrives late
- **THEN** 120 remains current and the old revision cannot overwrite or add to it

#### Scenario: Withdraw and restore
<!-- scenario-id: EPR-R2-S04 -->

- **GIVEN** a current final report is withdrawn by revision 4
- **WHEN** its period and then a valid revision 5 restoration are evaluated
- **THEN** withdrawal removes usable coverage without deleting history, and restoration becomes effective once rather than adding another report

#### Scenario: Publisher replacement
<!-- scenario-id: EPR-R2-S05 -->

- **GIVEN** a new approved sender republishes the same business period
- **WHEN** admission runs
- **THEN** sender identity does not create a second additive report and revision lineage is preserved

### Requirement: Report admission and projection invalidation commit atomically
<!-- requirement-id: EPR-R3 -->

The server SHALL persist immutable report revisions, a unique business-key/dataRevision constraint, the current pointer and durable projection invalidation/outbox in one transaction. Conflicting concurrent updates SHALL be serialized or fail by compare-and-swap. A deduplication marker SHALL never commit before the report it protects. Response loss after commit SHALL permit exact-request recovery; failure before commit SHALL leave retry possible. Projection readers SHALL not serve invalidated output as current; recomputation SHALL use a consistent input snapshot and recheck its fingerprint before publication. Report deduplication SHALL survive process restarts and expiration of unrelated configuration-idempotency caches.

#### Scenario: Crash before commit
<!-- scenario-id: EPR-R3-S01 -->

- **GIVEN** a valid revision is being admitted
- **WHEN** the process exits before the database transaction commits
- **THEN** no lasting dedup marker prevents a retry from admitting the report

#### Scenario: Lost success response
<!-- scenario-id: EPR-R3-S02 -->

- **GIVEN** a correction and invalidation committed but the response was lost
- **WHEN** the same correction is retried
- **THEN** the prior committed outcome is returned without an additional revision or energy contribution

#### Scenario: Correction races with projection
<!-- scenario-id: EPR-R3-S03 -->

- **GIVEN** a projection reads revision 1 while revision 2 commits
- **WHEN** the old computation attempts to publish
- **THEN** fingerprint validation prevents it from becoming current; consumers see stale/pending until a consistent result is ready

### Requirement: Period totals use one effective result and explicit coverage
<!-- requirement-id: EPR-R4 -->

Engineering totals SHALL sum one effective usable daily result per engineering/date from the expected engineering set and effective accounting definition. Complete, final and valid SHALL be required for complete coverage; preliminary, partial, unknown and withdrawn SHALL remain explicit incomplete states. Daily values SHALL be summed rather than differenced. Missing engineering/date pairs SHALL not be replaced by zero, previous periods, raw meters or Solar. A newer incomplete revision SHALL degrade usable coverage rather than silently retaining a previous final. Partial sums SHALL be labeled partial with missing identities; unreviewed factory-wide coverage SHALL be named engineering total, not full-site consumption. A zero denominator SHALL yield unavailable ratios, not infinity or invented equal shares.

#### Scenario: Two daily values
<!-- scenario-id: EPR-R4-S01 -->

- **GIVEN** daily results are 100 and 120 kWh
- **WHEN** their two-day period is aggregated
- **THEN** the result is 220 kWh, not 20 kWh

#### Scenario: One engineering missing
<!-- scenario-id: EPR-R4-S02 -->

- **GIVEN** seven expected engineerings have complete results and one does not
- **WHEN** the daily total is requested
- **THEN** it is explicitly partial with the missing ID and never a complete eight-engineering total

#### Scenario: New partial revision
<!-- scenario-id: EPR-R4-S03 -->

- **GIVEN** a newer authorized revision changes a final report to partial
- **WHEN** the period refreshes
- **THEN** its complete-coverage status is removed and prior final data is not silently kept as current

#### Scenario: Zero basis
<!-- scenario-id: EPR-R4-S04 -->

- **GIVEN** every valid engineering result is zero
- **WHEN** department ratios are evaluated
- **THEN** the sum may be zero but ratios remain unavailable with a zero-basis reason

#### Scenario: Profile expectation changes
<!-- scenario-id: EPR-R4-S05 -->

- **GIVEN** an engineering is intentionally excluded starting September 16
- **WHEN** September 15 and 16 are evaluated
- **THEN** the correct effective profile applies to each day and missing data cannot itself change expected membership

### Requirement: Daily delivery recovery is bounded and separate from discovery
<!-- requirement-id: EPR-R5 -->

Daily-report reception SHALL support replay of authentic publisher reports or an explicitly authorized import through the same semantic and transaction gates. Latest retained delivery SHALL retain original period/version and SHALL not represent complete multi-day history. Discovery and offline examples SHALL not be promoted into production records. Default proposed recovery bounds SHALL be 31 days, eight engineering IDs and 248 records per batch, 64 KiB per message and 4 MiB per import, with a 93-day normal replay window; older recovery SHALL require separate explicit approval and the same batch bounds. Duplicate-key JSON, depth greater than eight and more than 64 top-level fields SHALL be rejected before domain writes. Effective source/calendar/authority approvals SHALL be verified for replay periods, including pre-activation backfill. Report head/version evidence SHALL persist for the accepted-history lifetime, or an irreversible rejection watermark SHALL survive its removal. Batch partial outcomes SHALL be individually reported.

#### Scenario: Offline for two days
<!-- scenario-id: EPR-R5-S01 -->

- **GIVEN** a receiver reconnects and gets only the latest retained report
- **WHEN** recovery evaluates missing days
- **THEN** the older missing periods remain visible until bounded original-report replay or authorized import fills them

#### Scenario: Oversized batch
<!-- scenario-id: EPR-R5-S02 -->

- **GIVEN** an import contains 249 records or exceeds 4 MiB
- **WHEN** the batch is submitted
- **THEN** it is rejected before domain writes rather than truncated into a success

#### Scenario: Mixed valid and invalid batch
<!-- scenario-id: EPR-R5-S03 -->

- **GIVEN** a bounded approved batch contains an unapproved period alongside valid records
- **WHEN** per-record processing finishes
- **THEN** the response identifies each accepted, duplicate or rejected result without claiming all records succeeded

#### Scenario: Old or pre-activation evidence
<!-- scenario-id: EPR-R5-S04 -->

- **GIVEN** a report predates the source activation or normal replay window
- **WHEN** replay is requested
- **THEN** explicit backfill authority and matching effective definitions are required; capture evidence alone cannot grant admission

### Requirement: Engineering accounting integrates through typed profile and result providers
<!-- requirement-id: EPR-R6 -->

The implementation SHALL introduce an explicit engineering source kind and typed accounting references rather than inserting fake meter rows or engineering IDs into E1 physical identities. SiteEnergyProfileV1 and its physical calculations SHALL remain compatible. A proposed V2 profile SHALL select a reviewed physical or engineering provider for an effective accounting period, without mixing overlapping parent/child coverage. Engineering daily and counter providers SHALL feed the common period result/projection/readiness interfaces with period, quality, missing identities and revision fingerprints. Existing physical meter algorithms SHALL not be loosened to manufacture interval coverage. Period energy SHALL not write power metric destinations. Unsupported V2 consumers SHALL fail visibly rather than downgrade silently.

#### Scenario: Engineering source without raw meters
<!-- scenario-id: EPR-R6-S01 -->

- **GIVEN** a reviewed engineering daily source has no physical rows
- **WHEN** a V2 engineering profile is applied
- **THEN** it can reference the engineering source without creating fictitious meterId or meter_readings

#### Scenario: Existing CL profile
<!-- scenario-id: EPR-R6-S02 -->

- **GIVEN** a V1 physical CL profile is read after adding engineering support
- **WHEN** its results are evaluated
- **THEN** the existing response and calculations remain compatible and its history is unchanged

#### Scenario: Overlapping accounting inputs
<!-- scenario-id: EPR-R6-S03 -->

- **GIVEN** a proposed engineering total is combined with the raw meters it summarizes
- **WHEN** profile validation runs
- **THEN** overlap is rejected or blocked pending an explicit non-overlap review, never silently added

#### Scenario: Display binding
<!-- scenario-id: EPR-R6-S04 -->

- **GIVEN** a complete daily engineering result is available
- **WHEN** the display editor binds it
- **THEN** it uses a period-aware kWh source; factoryCircuit.*Power retains kW semantics

### Requirement: Engineering rollout preserves audit and requires only the relevant evidence
<!-- requirement-id: EPR-R7 -->

Engineering rollout SHALL require a confirmed engineering result contract, effective coverage definition, chosen mode, publisher responsibility, quality limitations and delivery/recovery policy. It SHALL NOT require upstream physical device inventories or a site-main meter merely to admit engineering results. Rollout SHALL proceed through contract preview, isolated message/revision tests, shadow comparison, single-authority activation, typed profile and display binding. Power verification SHALL use its cadence; daily-report verification SHALL use its reporting periods and correction/recovery tests. Field observation targets SHALL not be represented as completed tests or universal gates for every mode. Rollback SHALL retain immutable records and disable only the affected new authority. Historical validation evidence SHALL remain labeled with its original commit and SHALL not be reused as proof of revised artifacts.

#### Scenario: First engineering ready
<!-- scenario-id: EPR-R7-S01 -->

- **GIVEN** painting has a reviewed result contract but no site-main meter or bottom-level device list
- **WHEN** its activation is reviewed
- **THEN** engineering activation is not blocked by those unrelated prerequisites while factory-total coverage remains separately unreviewed

#### Scenario: Staged engineering commissioning
<!-- scenario-id: EPR-R7-S02 -->

- **GIVEN** one engineering passes isolated checks and others remain unconfigured
- **WHEN** the first is enabled
- **THEN** the remaining rows stay visible and incomplete; the system does not claim full KN readiness

#### Scenario: Historical report of checks
<!-- scenario-id: EPR-R7-S03 -->

- **GIVEN** the old planning-checks.json describes 8beacbd
- **WHEN** new engineering artifacts are committed
- **THEN** a new dated check record reports actual current checks and old counts are not presented as current validation
