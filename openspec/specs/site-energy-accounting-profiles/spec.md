# site-energy-accounting-profiles Specification

## Purpose

TBD - created by archiving change 'add-site-energy-accounting-profiles'. Update Purpose after archive.

## Requirements

### Requirement: Each concrete site owns one authoritative accounting profile
<!-- requirement-id: E6-R1 -->

The system SHALL persist one independently versioned accounting profile per concrete site. CL and KN SHALL NOT share source selections by default. Profiles SHALL distinguish site total sources, department source sets, share comparison basis and calendar authority from page presentation. E1 source definitions SHALL contribute physical identity, measurement semantics and `energyFlowRole` only; they SHALL NOT persist `site-main|department` ownership or `departmentId`. A global or all-sites filter SHALL NOT become an editable physical site.

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

#### Scenario: Accounting reassignment preserves source state
<!-- scenario-id: E6-R1-S03 -->

- **GIVEN** a physical channel has an E1 source revision, accepted observations and a persisted baseline while an E6 profile assigns it to a department
- **WHEN** a new E6 profile revision assigns the same channel to site total
- **THEN** only the E6 profile membership and revision change; the E1 source revision, epoch, accepted observations and baseline remain unchanged

---
### Requirement: Site total sources are selected separately from share denominators
<!-- requirement-id: E6-R2 -->

The profile SHALL store siteTotal as unconfigured or an explicit non-overlapping meter-channel set with a reviewed measurement boundary. Main meters can be one or multiple parallel incoming supplies. Overview day/month/year and monthly consumption SHALL resolve this siteTotal, never silently substitute the share denominator. The profile SHALL permit a configured managed-department share view while siteTotal is missing, with site totals unavailable.

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

---
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

---
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

---
### Requirement: Validation prevents incompatible units and overlap without forbidding legitimate hierarchy
<!-- requirement-id: E6-R5 -->

The server SHALL validate concrete site, reviewed energy measurement kind, normalized units, `energyFlowRole` and accounting boundaries. It SHALL reject duplicate physical channels or known parent-child overlap within the same additive set and across disjoint department sets. A main denominator covering a child numerator is legitimate and SHALL NOT be rejected simply because of ancestry. Unknown topology SHALL require an explicit operator review instead of pretending names prove disjointness. Grid-import, export, generation and plant-load boundaries SHALL not be equated by label alone or by the E1 source display name.

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

---
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

#### Scenario: Source versions are managed without operator input
<!-- scenario-id: E6-R6-S04 -->

- **GIVEN** a draft selects source channels for site total, departments and a meter-set share basis
- **WHEN** the operator previews and applies the draft
- **THEN** the server SHALL capture the latest existing, enabled, reviewed energy source definitions for all selected channels in the concrete site and bind their identities, source revisions and calculation settings to the preview token without requiring version fields or a version selector in the UI
- **AND** a selected source changing revision, meter identity, epoch, availability, cadence or boundary tolerance before apply SHALL cause a `PROFILE_SOURCE_CONFLICT` response with status 409 and no profile or receipt writes; display-name-only changes and unrelated channels or sites SHALL NOT invalidate the preview
- **AND** the UI SHALL retain the draft, discard the stale preview and offer the existing preview action with a plain-language explanation; successful idempotent retries SHALL still return their original result
- **AND** unknown or unusable selected sources SHALL fail preview with `PROFILE_SOURCE_UNAVAILABLE` and status 422; tokens created without a source snapshot SHALL require a new preview with `PROFILE_SOURCE_REVIEW_REQUIRED` and status 409

---
### Requirement: Effective-dated profile changes preserve historical meaning
<!-- requirement-id: E6-R7 -->

Activation SHALL default to prospective effect and retain prior profile revisions and their effective intervals. Previously computed closed periods SHALL remain attributed to their original revisions. A period spanning materially changed membership or siteTimeZone SHALL be unavailable or explicitly partial/segmented until an authorized history policy resolves it; the UI SHALL NOT join unlike denominators into an unlabeled full-period percentage. Historical remapping/recomputation requires a separate bounded dry-run and confirmation. Rollback SHALL append a new activation, not erase audit history.

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

---
### Requirement: Consumers share accounting configuration without duplicating it in page drafts
<!-- requirement-id: E6-R8 -->

Site-based consumption and share consumers SHALL reference the profile by concrete or device-inherited site and stable department identity. The system SHALL allow presentation period and appearance to remain page settings; raw total/numerator/denominator selections SHALL NOT be copied into a second editor-owned definition. Profile apply SHALL show all known current consumers and distinguish existing profile-following consumers from legacy/custom bindings that need explicit migration. Unknown consumer resolution SHALL NOT be represented as zero impact.

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

---
### Requirement: Valid configuration and sufficient data are separate states
<!-- requirement-id: E6-R9 -->

A structurally valid profile SHALL be saveable or explicitly activatable with missing historical boundaries, exposing configured-waiting-for-data separately from fully ready. Invalid meter kind, conflicting membership or absent required structural choices SHALL block activation but allow a clearly marked resumable draft. The server SHALL provide actionable named diagnostics and finite nullable values, never manufacture period baselines or percentages.

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

---
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

---
### Requirement: Profile site time zone is the calendar authority
<!-- requirement-id: E6-R11 -->

The E6 profile revision selected and verified by the server SHALL persist one valid IANA `siteTimeZone` and SHALL be the sole authority for day, month and year calendar boundaries. E1 `sourceTimestampTimeZone` SHALL be used only by E1 to parse a source timestamp without an offset; E2 SHALL consume the resulting normalized UTC instant. A source time zone different from `siteTimeZone` SHALL remain valid after normalization. A server-validated profile draft SHALL be allowed to propose a new `siteTimeZone` within a review context bound to the expected persisted revision; unbound period callers SHALL NOT override the profile time zone or provide arbitrary start/end boundaries. Changing `siteTimeZone` SHALL create a new profile revision; closed history SHALL retain its original profile revision and SHALL NOT be silently recalculated.

#### Scenario: UTC source reaches the Asia/Taipei month boundary
<!-- scenario-id: E6-R11-S01 -->

- **GIVEN** E1 parses `2026-08-31 16:00:00` with `sourceTimestampTimeZone=UTC` and stores normalized instant `2026-08-31T16:00:00Z`, while the selected and server-verified profile revision has `siteTimeZone=Asia/Taipei`
- **WHEN** the September 2026 period is resolved
- **THEN** the profile month starts at `2026-08-31T16:00:00Z`, and the resolver uses that profile boundary without reparsing the source timestamp with the host time zone

#### Scenario: Calendar override or unknown profile revision is rejected
<!-- scenario-id: E6-R11-S02 -->

- **GIVEN** a resolver request contains an unbound `timeZone`, `start` or `end` override, or names a profile revision that does not exist for the concrete site
- **WHEN** the request is validated
- **THEN** the server returns a stable override or profile-revision error and does not calculate or persist a result

#### Scenario: Time zone change creates a revision
<!-- scenario-id: E6-R11-S03 -->

- **GIVEN** a site has a closed period under profile revision 7 with `siteTimeZone=Asia/Taipei`
- **WHEN** an operator changes the site time zone to another valid IANA zone and applies the profile
- **THEN** profile revision 8 owns future calculations, closed history remains attributed to revision 7, open periods crossing the timezone change are partial/segmented or unavailable, and no source revision, epoch or baseline is reset

---
### Requirement: The management profile preview returns calculated review evidence

The normal management profile-preview API SHALL calculate review results from the server-validated immutable draft and selected source snapshot. Its response SHALL identify the review context, requested period, site calendar, source revisions, site total, department numerators, denominator members/value, shares and coverage/quality diagnostics. An absent calculation SHALL NOT be represented as missing measurements. Preview SHALL NOT activate a profile, alter accepted readings, publish MQTT or populate production history/projection caches; storing the preview token and review evidence is permitted.

#### Scenario: R9 complete readings reach the actual preview route
- **WHEN** the normal preview API receives a valid draft and its selected sources have valid same-period readings
- **THEN** it returns the calculated total, numerator, denominator and ratio for that draft rather than a null calculator placeholder
- **AND** the active profile, accepted readings and production projections remain unchanged

#### Scenario: R9 draft calendar differs from active calendar
- **WHEN** a reviewed draft uses a different site time zone from the active profile
- **THEN** preview uses the draft's calendar within its identified review context without claiming that the draft is already an active persisted revision

#### Scenario: R9 missing baseline is distinguishable from calculation failure
- **WHEN** the selected source lacks a required period baseline
- **THEN** preview returns nullable results with a missing-baseline diagnostic; a calculation failure instead returns an explicit error and no usable new preview token


<!-- @trace
source: fix-site-energy-preview-readiness
updated: 2026-09-08
code:
  - apps/web/src/pages/DataHub/SiteEnergyPreviewReview.tsx
  - apps/server/src/routes/site-energy-profiles.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/server/src/services/profileReadiness.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - packages/shared/src/periodConsumption.ts
  - apps/server/src/services/profileReadinessService.ts
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/services/siteEnergyProfileService.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.tsx
  - apps/server/src/services/siteEnergyProfileRepository.ts
  - apps/server/src/db/migrations/051_profile_preview_evidence.sql
tests:
  - packages/shared/src/periodConsumption.test.ts
  - packages/shared/src/siteEnergyProfile.test.ts
  - apps/server/src/services/siteEnergyProfileService.test.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupJourney.test.tsx
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/site-energy-readiness-publishing.test.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.test.tsx
  - apps/server/src/routes/site-energy-profiles.test.ts
  - apps/server/src/services/siteEnergyProfileSourceReview.test.ts
-->

---
### Requirement: Profile readiness is derived from validated configuration and evidence

The server SHALL derive authoritative readiness from validated structure, review state and the relevant period evidence, independently of client event history or a submitted ready flag. Structurally invalid choices SHALL block activation. Valid reviewed configuration with insufficient readings SHALL be distinguishable as configured-awaiting-data, not incomplete solely because an unchanged default control emitted no event. Apply SHALL retain source-snapshot and expected-revision conflict protection. Readiness exposed to consumers SHALL describe the evidence it actually checks rather than promise every historical period is complete.

#### Scenario: R10 a client cannot forge readiness
- **WHEN** a client submits status=ready for a valid configuration with only one cumulative reading and no usable baseline
- **THEN** the authoritative result reports waiting for sufficient data and does not claim ready period totals

#### Scenario: R10 equivalent reviewed drafts have equivalent readiness
- **WHEN** two otherwise identical reviewed drafts are submitted, one retaining the default denominator and the other switching away and back
- **THEN** both receive the same server-derived readiness and the same publication-relevant diagnostics

#### Scenario: Source changes still invalidate confirmation
- **WHEN** a selected source changes after numeric preview but before activation
- **THEN** apply returns the existing source-conflict response with no profile or receipt mutation, preserving the draft for another preview

<!-- @trace
source: fix-site-energy-preview-readiness
updated: 2026-09-08
code:
  - apps/web/src/pages/DataHub/SiteEnergyPreviewReview.tsx
  - apps/server/src/routes/site-energy-profiles.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/server/src/services/profileReadiness.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - packages/shared/src/periodConsumption.ts
  - apps/server/src/services/profileReadinessService.ts
  - packages/shared/src/siteEnergyProfile.ts
  - apps/server/src/services/siteEnergyProfileService.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.tsx
  - apps/server/src/services/siteEnergyProfileRepository.ts
  - apps/server/src/db/migrations/051_profile_preview_evidence.sql
tests:
  - packages/shared/src/periodConsumption.test.ts
  - packages/shared/src/siteEnergyProfile.test.ts
  - apps/server/src/services/siteEnergyProfileService.test.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupJourney.test.tsx
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/server/src/routes/site-energy-readiness-publishing.test.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.test.tsx
  - apps/server/src/routes/site-energy-profiles.test.ts
  - apps/server/src/services/siteEnergyProfileSourceReview.test.ts
-->