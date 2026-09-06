## ADDED Requirements

### Requirement: Each concrete site owns one authoritative accounting profile
<!-- requirement-id: E6-R1 -->

The system SHALL persist one independently versioned accounting profile per concrete site. CL and KN SHALL NOT share source selections by default. Profiles SHALL distinguish site total sources, department source sets and share comparison basis from page presentation. A global or all-sites filter SHALL NOT become an editable physical site.

#### Scenario: Independent choices
<!-- scenario-id: E6-R1-S01 -->

- **GIVEN** CL uses main meter CL-M and KN uses KN-M
- **WHEN** KN is edited and applied
- **THEN** CL profile revision, membership and displayed totals are unchanged

#### Scenario: Filter is not ownership
<!-- scenario-id: E6-R1-S02 -->

- **GIVEN** the navigation filter is all
- **WHEN** an operator starts site energy setup
- **THEN** a concrete site is selected before any mapping can be applied

### Requirement: Site total sources are selected separately from share denominators
<!-- requirement-id: E6-R2 -->

The profile SHALL store siteTotal as unconfigured or an explicit non-overlapping meter-channel set with a reviewed measurement boundary. Main meters can be one or multiple parallel incoming supplies. Overview day/month/year and monthly consumption SHALL resolve this siteTotal, never silently substitute the share denominator. Missing siteTotal MAY coexist with a configured managed-department share view, with site totals unavailable.

#### Scenario: Two parallel main meters
<!-- scenario-id: E6-R2-S01 -->

- **GIVEN** two independent main-meter deltas are 600 and 400 kWh
- **WHEN** both are explicitly selected as the site total
- **THEN** site total is 1000 kWh and original register magnitudes are not added as period consumption

#### Scenario: No main meter
<!-- scenario-id: E6-R2-S02 -->

- **GIVEN** no site total meter has been reviewed but department sources are known
- **WHEN** managed-department sum is explicitly selected
- **THEN** department shares can be configured while overview whole-site consumption stays unavailable with a configure-source action

### Requirement: Department numerators have explicit multi-meter membership
<!-- requirement-id: E6-R3 -->

Each department SHALL have a stable identity, name and one or more eligible meter-channel references. Department consumption SHALL sum same-period deltas of its non-overlapping channels. Renaming a department or changing card visibility SHALL NOT change its source membership. No allocation percentages or source-key typing SHALL be required for normal membership setup.

#### Scenario: Department has two meters
<!-- scenario-id: E6-R3-S01 -->

- **GIVEN** stamping uses two non-overlapping meters with 180 and 120 kWh deltas
- **WHEN** department consumption is requested
- **THEN** stamping consumption is 300 kWh with traceable members

#### Scenario: Rename and hide
<!-- scenario-id: E6-R3-S02 -->

- **GIVEN** a mapped department is renamed and its card is hidden
- **WHEN** other department shares are refreshed
- **THEN** accounting membership and denominator do not change

### Requirement: One explicit comparison basis applies to each share group
<!-- requirement-id: E6-R4 -->

A profile SHALL select site-main (the siteTotal reference), department-sum (explicit accounted department IDs), or meter-set (a separately named comparison-meter set). A share group SHALL use a common denominator and window across departments. A meter-set SHALL carry an accurate named boundary; it SHALL NOT be called whole-site by default. The system SHALL NOT silently switch modes, select only visible departments, or mix independent denominators into one pie or percentage group.

#### Scenario: Comparison scope is independent
<!-- scenario-id: E6-R4-S01 -->

- **GIVEN** site total is 1000 kWh but a reviewed production-only comparison set is 800 kWh and stamping is 200 kWh within that boundary
- **WHEN** production comparison is selected
- **THEN** stamping displays 25% with a production-scope label while overview site total remains 1000 kWh

#### Scenario: Explicit department sum
<!-- scenario-id: E6-R4-S02 -->

- **GIVEN** department deltas are 200 and 300 kWh and no main source is available
- **WHEN** their managed-department sum is explicitly chosen
- **THEN** shares are 40% and 60%, labeled managed-department share rather than whole-site

### Requirement: Validation prevents incompatible units and overlap without forbidding legitimate hierarchy
<!-- requirement-id: E6-R5 -->

The server SHALL validate concrete site, reviewed energy measurement kind, normalized units and accounting boundaries. It SHALL reject duplicate physical channels or known parent-child overlap within the same additive set and across disjoint department sets. A main denominator covering a child numerator is legitimate and SHALL NOT be rejected simply because of ancestry. Unknown topology SHALL require an explicit operator review instead of pretending names prove disjointness. Grid-import, export, generation and plant-load boundaries SHALL not be equated by label alone.

#### Scenario: Parent denominator and child numerator
<!-- scenario-id: E6-R5-S01 -->

- **GIVEN** a reviewed whole-site main meter covers a department submeter
- **WHEN** the main is denominator and the child is numerator
- **THEN** the configuration is eligible, while selecting both in the same total sum is rejected

#### Scenario: Wrong kind or site
<!-- scenario-id: E6-R5-S02 -->

- **GIVEN** KN setup receives a CL meter ID or a kW-only gauge through an API call
- **WHEN** the draft is validated
- **THEN** field-level errors reject those references rather than coercing site or unit

#### Scenario: PV changes accounting boundary
<!-- scenario-id: E6-R5-S03 -->

- **GIVEN** a utility-import meter excludes behind-the-meter solar consumed by department loads
- **WHEN** that meter is selected as whole-factory consumption
- **THEN** validation requests a matching reviewed consumption source or a correctly bounded alternative; utility imports are not declared total consumption

#### Scenario: Undocumented overlap
<!-- scenario-id: E6-R5-S04 -->

- **GIVEN** two physical meter channels have no reviewed coverage relation
- **WHEN** an operator proposes adding both
- **THEN** the UI asks a plain-language non-overlap confirmation and records its provenance; it does not claim automatic topology discovery

### Requirement: Preview and activation are version-bound and atomic
<!-- requirement-id: E6-R6 -->

Authorized management APIs SHALL accept an expected profile revision and a draft, produce a side-effect-free preview tied to profile and source revisions, and atomically activate the entire site profile only after confirmation. Preview SHALL expose site totals, department numerators, denominator kind/value/membership, data coverage and impacted consumers. Stale source definitions, profile conflicts or unknown impact SHALL block blind activation and preserve the draft. Repeated activation requests with one idempotency key SHALL NOT duplicate versions.

#### Scenario: Read-only review
<!-- scenario-id: E6-R6-S01 -->

- **GIVEN** a KN draft changes both total and department membership
- **WHEN** preview is requested
- **THEN** no active profile, telemetry, MQTT message, page draft or historical row is modified

#### Scenario: Concurrent revision
<!-- scenario-id: E6-R6-S02 -->

- **GIVEN** the reviewed profile or source definitions change before apply
- **WHEN** the operator confirms the old preview
- **THEN** the system returns a version conflict, preserves inputs and requires a refreshed preview

#### Scenario: No half-applied setup
<!-- scenario-id: E6-R6-S03 -->

- **GIVEN** a department membership fails validation after total source selection
- **WHEN** apply is requested
- **THEN** neither part replaces the active profile

### Requirement: Effective-dated profile changes preserve historical meaning
<!-- requirement-id: E6-R7 -->

Activation SHALL default to prospective effect and retain prior profile revisions and their effective intervals. Previously computed closed periods SHALL remain attributed to their original revisions. A period spanning materially changed membership SHALL be unavailable or explicitly partial/segmented until an authorized history policy resolves it; the UI SHALL NOT join unlike denominators into an unlabeled full-period percentage. Historical remapping/recomputation requires a separate bounded dry-run and confirmation. Rollback SHALL append a new activation, not erase audit history.

#### Scenario: Change meter in midmonth
<!-- scenario-id: E6-R7-S01 -->

- **GIVEN** the active meter set changes during September
- **WHEN** September-to-date and August history are displayed
- **THEN** August remains attributed to its old revision; September is marked partial or segmented unless an explicitly approved reconstruction is available

#### Scenario: Rollback does not rewrite samples
<!-- scenario-id: E6-R7-S02 -->

- **GIVEN** a prior profile is restored for future calculation
- **WHEN** rollback is confirmed
- **THEN** raw samples and historical revisions are preserved and a new activation event is recorded

### Requirement: Consumers share accounting configuration without duplicating it in page drafts
<!-- requirement-id: E6-R8 -->

Site-based consumption and share consumers SHALL reference the profile by concrete or device-inherited site and stable department identity. Presentation period and appearance MAY remain page settings; raw total/numerator/denominator selections SHALL NOT be copied into a second editor-owned definition. Profile apply SHALL show all known current consumers and distinguish existing profile-following consumers from legacy/custom bindings that need explicit migration. Unknown consumer resolution SHALL NOT be represented as zero impact.

#### Scenario: One correction reaches all followers
<!-- scenario-id: E6-R8-S01 -->

- **GIVEN** overview and circuit page already follow the KN profile
- **WHEN** the profile denominator is corrected
- **THEN** both resolve the same new revision without separately editing MQTT or page formulas

#### Scenario: Custom page is not silently overwritten
<!-- scenario-id: E6-R8-S02 -->

- **GIVEN** a page retains a reviewed custom pinned binding
- **WHEN** site setup is applied
- **THEN** impact preview identifies the exception and offers an explicit separate migration action rather than rewriting the page

### Requirement: Valid configuration and sufficient data are separate states
<!-- requirement-id: E6-R9 -->

A profile MAY be saved or explicitly activated with structurally valid sources but missing historical boundaries, exposing configured-waiting-for-data separately from fully ready. Invalid meter kind, conflicting membership or absent required structural choices SHALL block activation but allow a clearly marked resumable draft. The server SHALL provide actionable named diagnostics and finite nullable values, never manufacture period baselines or percentages.

#### Scenario: Only one sample
<!-- scenario-id: E6-R9-S01 -->

- **GIVEN** the selected cumulative meter has one observation
- **WHEN** the operator completes setup
- **THEN** the source can be configured but day/month/year readiness states honestly show missing baselines, not zero consumption

#### Scenario: Denominator missing
<!-- scenario-id: E6-R9-S02 -->

- **GIVEN** a profile selects site-main but has no total source
- **WHEN** review is opened
- **THEN** the denominator control is identified as needing selection; applying the incomplete structure is blocked

### Requirement: Guided MQTT sources integrate through the authoritative site profile
<!-- requirement-id: E6-R10 -->

The site profile SHALL accept reviewed stable source references from M2, never raw wildcard filters or unverified catalog candidates. An explicit combined source-and-profile apply SHALL validate both revisions and physical conflicts atomically; source-only apply SHALL not alter siteTotal or shareBasis. Changing names or unrelated mappings SHALL not silently replace profile meter references.

#### Scenario: Sources and profile reviewed together
<!-- scenario-id: E6-R10-S01 -->

- **GIVEN** M2 source drafts and KN profile selections pass preview
- **WHEN** the operator confirms the combined apply
- **THEN** all reviewed references become valid together or no configuration changes are committed

#### Scenario: Observation without role confirmation
<!-- scenario-id: E6-R10-S02 -->

- **GIVEN** a candidate is named MAIN by its publisher
- **WHEN** it appears in M1
- **THEN** the profile does not automatically adopt it as site total or share denominator
