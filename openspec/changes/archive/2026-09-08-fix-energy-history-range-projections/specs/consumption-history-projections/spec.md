## MODIFIED Requirements

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

## ADDED Requirements

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

### Requirement: Canonical unavailable results do not trigger legacy consumption fallback

For an existing site accounting profile, missing evidence, unsupported calculations and calculation errors SHALL remain distinguishable from the absence of a configured profile. Energy-history and energy-trend consumers SHALL NOT substitute legacy counters, legacy summary consumption, or zero for a canonical unavailable result. A known measured zero SHALL remain distinguishable from no supported measurement. Existing global and no-profile compatibility paths SHALL remain explicitly separate.

#### Scenario: N4 missing week evidence is not zero

- **GIVEN** a configured site has no supported week delta and its legacy summaries contain only null consumption or unrelated numeric sentinels
- **WHEN** management history or trend renders the week selection
- **THEN** consumption is displayed as unavailable with its quality or reason, not zero and not a legacy sentinel

#### Scenario: N4 measured zero remains valid

- **GIVEN** two distinct eligible boundary observations prove a continuous requested-span delta of zero
- **WHEN** the consumption card is rendered
- **THEN** it displays zero as a measured result rather than treating it as unavailable
