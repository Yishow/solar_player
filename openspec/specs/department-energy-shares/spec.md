# department-energy-shares Specification

## Purpose

TBD - created by archiving change 'fix-department-energy-shares'. Update Purpose after archive.

## Requirements

### Requirement: Department shares use matching consumption deltas
<!-- requirement-id: E5-R1 -->

Energy share SHALL equal department period consumption divided by the explicitly selected denominator consumption, multiplied by 100. Numerator and denominator SHALL share site, window, unit, boundary policy and calculation version. Fixed seed shares and rated-capacity utilization SHALL NOT substitute for energy shares.

#### Scenario: Measured proportions
<!-- scenario-id: E5-R1-S01 -->

- **GIVEN** department deltas are 250,150,100 kWh and the denominator is 500 kWh
- **WHEN** shares are calculated
- **THEN** the shares are 50%,30%,20%, irrespective of legacy seed percentages

#### Scenario: Mixed units
<!-- scenario-id: E5-R1-S02 -->

- **GIVEN** the denominator is an energy delta in kWh but a department has only a kW gauge
- **WHEN** energy-share mode is requested
- **THEN** that department is unavailable with an incompatible measurement diagnostic

---
### Requirement: The denominator is explicit and never silently changes
<!-- requirement-id: E5-R2 -->

The E6 site profile SHALL select site-main, department-sum, or a separately named, reviewed meter-set comparison boundary. All members of the share group SHALL use that same denominator. A configured but unavailable main meter SHALL NOT trigger an automatic denominator switch. Department-sum SHALL be labeled as the share of managed departments rather than the whole site.

#### Scenario: Configured main meter missing
<!-- scenario-id: E5-R2-S01 -->

- **GIVEN** site-main is selected and its baseline is missing
- **WHEN** department samples are otherwise available
- **THEN** shares remain unavailable rather than switching to their sum

#### Scenario: Managed-only denominator
<!-- scenario-id: E5-R2-S02 -->

- **GIVEN** the operator explicitly selects department-sum
- **WHEN** the screen renders
- **THEN** the label states managed-department consumption share and exposes membership

---
### Requirement: Zero and partial denominator states are honest
<!-- requirement-id: E5-R3 -->

A known zero numerator with a positive denominator SHALL yield 0 percent. A zero or invalid denominator SHALL yield null shares. Department-sum with missing required members SHALL not renormalize only the visible or available members.

#### Scenario: All departments idle
<!-- scenario-id: E5-R3-S01 -->

- **GIVEN** all eligible period deltas and the total equal zero
- **WHEN** shares are requested
- **THEN** the UI displays an em dash with zero-total explanation, not NaN or fabricated percentages

#### Scenario: One required department missing
<!-- scenario-id: E5-R3-S02 -->

- **GIVEN** department-sum requires A,B,C and C is unavailable
- **WHEN** A and B have data
- **THEN** the group is partial/unavailable and A/B are not inflated to sum to 100

---
### Requirement: Meter membership prevents double counting
<!-- requirement-id: E5-R4 -->

A contributing physical channel SHALL belong to only one non-overlapping department set for a denominator. Visual hiding SHALL NOT change accounting membership. Duplicates across departments or ancestor-descendant double counting within the same additive set SHALL be rejected with the conflicting identities. A parent meter as denominator and its child as numerator is valid containment, not double counting.

#### Scenario: Duplicate meter
<!-- scenario-id: E5-R4-S01 -->

- **GIVEN** the same meter is assigned to stamping and painting
- **WHEN** the configuration is validated
- **THEN** publication/save is blocked with both conflicting department names

#### Scenario: Hide one card
<!-- scenario-id: E5-R4-S02 -->

- **GIVEN** all accounting members remain enabled and one department card is hidden
- **WHEN** the screen recalculates
- **THEN** other shares and the denominator remain unchanged

---
### Requirement: Unallocated energy and inconsistent totals are visible
<!-- requirement-id: E5-R5 -->

With a site-main denominator, known unmatched consumption MAY be shown as unallocated energy. Missing department data SHALL qualify that label. A materially greater child total SHALL surface a consistency error instead of clamping shares or concealing negative residuals.

#### Scenario: Unallocated amount
<!-- scenario-id: E5-R5-S01 -->

- **GIVEN** the main delta is 1000 and complete departments total 850 kWh
- **WHEN** the breakdown is calculated
- **THEN** 150 kWh is labeled other/unallocated, not automatically attributed to losses

#### Scenario: Children exceed main
<!-- scenario-id: E5-R5-S02 -->

- **GIVEN** complete child deltas total 1100 while the main is 1000 beyond configured tolerance
- **WHEN** the breakdown is validated
- **THEN** the inconsistency is visible and no artificial 100 percent cap hides it

---
### Requirement: Energy periods and instantaneous power remain distinct
<!-- requirement-id: E5-R6 -->

The editor SHALL persist the selected energy-share period, initially day, through draft and live configuration. Instantaneous kW and power-share values SHALL use separately typed fields and SHALL never be relabeled as period consumption.

#### Scenario: Change period
<!-- scenario-id: E5-R6-S01 -->

- **GIVEN** the operator changes today energy shares to month and publishes
- **WHEN** runtime reloads
- **THEN** the label and all numerator/denominator windows switch together to month

#### Scenario: Only cumulative data exists
<!-- scenario-id: E5-R6-S02 -->

- **GIVEN** a circuit has kWh register observations but no instantaneous gauge
- **WHEN** the page renders
- **THEN** energy shares may be shown, while the instantaneous kW field remains unavailable

---
### Requirement: Share presentation preserves quality and finite values
<!-- requirement-id: E5-R7 -->

Story payloads SHALL provide nullable shares and coverage/freshness metadata. UI formatting SHALL handle null, zero, estimated and stale values without static fallback. Display rounding SHALL not rewrite authoritative ratios.

#### Scenario: Repeating thirds
<!-- scenario-id: E5-R7-S01 -->

- **GIVEN** three equal departments share a department-sum total
- **WHEN** one decimal is displayed
- **THEN** 33.3%,33.3%,33.3% is permitted and the source ratios remain exactly one third

#### Scenario: Stale department
<!-- scenario-id: E5-R7-S02 -->

- **GIVEN** a required reading ages beyond its freshness policy
- **WHEN** the runtime refreshes
- **THEN** the stale/partial state is visible and the legacy 25% seed is not reintroduced

---
### Requirement: Source membership is edited through the common site profile
<!-- requirement-id: E5-R8 -->

The share service SHALL consume E6 profile numerator and denominator membership. The editor SHALL store presentation period/style and a stable profile/department reference, not a second independent denominator. A meter-set comparison SHALL preserve its named boundary and never be relabeled as whole-site. Source editing SHALL enter U6 in context.

#### Scenario: One canonical edit
<!-- scenario-id: E5-R8-S01 -->

- **GIVEN** an operator corrects the KN painting meter from a selected card
- **WHEN** U6 applies the profile revision
- **THEN** other profile-following views use that revision; the card retains its presentation period and no duplicate mapping is saved

#### Scenario: Custom meter denominator
<!-- scenario-id: E5-R8-S02 -->

- **GIVEN** a reviewed comparison set is 800 kWh and a department is 200 kWh
- **WHEN** the server resolves that share group
- **THEN** it yields 25% with that comparison label and leaves the siteTotal unchanged

---
### Requirement: Persisted share calculations use one effective period context
<!-- requirement-id: E5-R9 -->

All department numerators and their common denominator SHALL use the same server-resolved effective profile revision, calendar window and as-of instant as the corresponding site period calculation. Selecting the latest active profile SHALL NOT bypass effective-date boundaries or reinterpret closed historical membership. Unproven cross-revision periods SHALL expose partial or unavailable shares and a named boundary reason, not exact percentages. Upstream quality and freshness SHALL survive aggregation.

#### Scenario: R5 membership changes during the requested month
<!-- scenario-id: E5-R9-S01 -->

- **WHEN** a site's accounting membership changes midway through a requested month and no reviewed continuity calculation covers both segments
- **THEN** site consumption and department shares identify the profile boundary, do not claim an exact full-month ratio, and retain the relevant revisions and effective dates

#### Scenario: R5 closed month retains historical membership
<!-- scenario-id: E5-R9-S02 -->

- **WHEN** a closed month is requested after a later profile assigns different department meters
- **THEN** the share result uses the profile effective for that closed period rather than reclassifying its readings using today's active profile


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

---
### Requirement: Custom denominator-only channels participate in period resolution
<!-- requirement-id: E5-R10 -->

Share calculation SHALL resolve every required channel from the selected denominator, including channels belonging to neither the site-total set nor a department. Missing denominator evidence SHALL remain explicit and SHALL NOT trigger a fallback to another denominator. Shared channels SHALL be resolved once without changing numerator or denominator membership.

#### Scenario: R6 independent meter-set denominator
<!-- scenario-id: E5-R10-S01 -->

- **WHEN** the selected period has site total A=1000 kWh, department B=100 kWh and the explicit custom denominator C=400 kWh, with C used nowhere else
- **THEN** B's ratio is 25 percent using C, while the site total remains 1000 kWh

#### Scenario: R6 custom denominator lacks its baseline
<!-- scenario-id: E5-R10-S02 -->

- **WHEN** C is selected as the denominator but its period delta cannot be established
- **THEN** the ratio is null with the missing-evidence reason, not 10 percent from A and not a department-sum fallback

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