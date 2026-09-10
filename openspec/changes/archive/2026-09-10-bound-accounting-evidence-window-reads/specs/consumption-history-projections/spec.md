## ADDED Requirements

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
