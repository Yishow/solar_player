## MODIFIED Requirements

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
