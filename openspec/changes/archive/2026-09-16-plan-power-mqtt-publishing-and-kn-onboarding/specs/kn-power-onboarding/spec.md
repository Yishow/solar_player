## Purpose

Specify the onboarding evidence gates and staged commissioning requirements for Guanyin engineering sources without requiring physical meter emulation.

## ADDED Requirements

### Requirement: KN registry begins with engineering results rather than physical points
<!-- requirement-id: KNP-R1 -->

KN SHALL use the eight existing engineering identities and the G KNE/EPR source contracts. Logical engineering IDs are known product vocabulary, not proof of active messages. Initial mode, publisher authority and real payload agreement SHALL remain unconfigured until reviewed. Player SHALL NOT require meterId, DDE Item, NodeId or CL device inventories for engineering activation. Upstream acquisition technology SHALL remain outside the receiver commissioning prerequisite.

#### Scenario: Known engineering no payload
<!-- scenario-id: KNP-R1-S01 -->

- **GIVEN** painting is a known slot but no real result contract is provided
- **WHEN** the plan is opened
- **THEN** the row is visible and unconfigured without pretending an actual source exists

#### Scenario: Aggregate without item inventory
<!-- scenario-id: KNP-R1-S02 -->

- **GIVEN** the publisher provides a reviewed engineering result and definition summary
- **WHEN** receiver commissioning is reviewed
- **THEN** absence of bottom-level meter or DDE Item lists does not block this source kind

### Requirement: KN begins per engineering and chooses measurement meaning explicitly
<!-- requirement-id: KNP-R2 -->

Each engineering MAY be commissioned independently using a confirmed power, daily-result or cumulative-result contract. Cadence SHALL NOT determine meaning. A site-main meter, grid purchase source or complete department device topology SHALL not be required to receive an engineering result. The chosen modes, units, total coverage and overlap rules SHALL follow G. Full-site consumption SHALL remain distinct from engineering-only totals, grid purchase and Solar generation.

#### Scenario: One engineering ready
<!-- scenario-id: KNP-R2-S01 -->

- **GIVEN** painting is reviewed and other engineering modes are unconfigured
- **WHEN** painting is enabled
- **THEN** it becomes available independently while missing engineering rows and factory coverage remain explicit

#### Scenario: No actual power
<!-- scenario-id: KNP-R2-S02 -->

- **GIVEN** engineering daily kWh exists without kW
- **WHEN** the power slot is rendered
- **THEN** it remains unavailable and no energy-to-power relabeling occurs

#### Scenario: No total meter
<!-- scenario-id: KNP-R2-S03 -->

- **GIVEN** all engineering results have approved contracts but no site-main source exists
- **WHEN** engineering reporting is configured
- **THEN** report reception and engineering totals can proceed with explicit coverage labels rather than demanding a fake main meter

### Requirement: KN commissioning follows report and mode-specific evidence gates
<!-- requirement-id: KNP-R3 -->

KN SHALL separately verify contract preview, isolated message/revision handling, source subscription, usable results, typed accounting profile and display binding. Daily results SHALL be tested for original period, corrections, partial/missing dates and bounded replay; counter and power modes SHALL use their own continuity/freshness tests. A valid complete daily result SHALL not wait for counter baselines. Field observation targets SHALL be approved for the selected mode and SHALL not be represented as completed acceptance. Missing actual payload or schedule SHALL block only the affected capability.

#### Scenario: One complete daily result
<!-- scenario-id: KNP-R3-S01 -->

- **GIVEN** a daily result has valid full-period evidence
- **WHEN** the period is read
- **THEN** it can be complete without two physical observations

#### Scenario: Result not due
<!-- scenario-id: KNP-R3-S02 -->

- **GIVEN** a daily report has not reached its reviewed deadline
- **WHEN** readiness refreshes
- **THEN** the receiver distinguishes not-due from missed delivery rather than applying a 90-second raw timeout

#### Scenario: Only documents verified
<!-- scenario-id: KNP-R3-S03 -->

- **GIVEN** new artifacts pass static checks
- **WHEN** deployment status is reported
- **THEN** runtime, publisher handoff and field acceptance remain unverified

### Requirement: KN rollout is independently reversible and preserves records
<!-- requirement-id: KNP-R4 -->

KN rollout SHALL require engineering contract owners, approved effective authorities, configuration backups and stop criteria, not upstream control writes. Unapproved modes or definitions SHALL not activate. Failure SHALL disable only the affected new engineering admission and retain report revisions, CL physical data and Solar subscriptions. G owns detailed replay/correction/projection behavior; this onboarding capability SHALL not create another writer or silently restore legacy physical fallback.

#### Scenario: One source fails
<!-- scenario-id: KNP-R4-S01 -->

- **GIVEN** painting fails a contract check
- **WHEN** rollout stops it
- **THEN** other engineering/CL/Solar owners continue and painting records are preserved

#### Scenario: Mode changes
<!-- scenario-id: KNP-R4-S02 -->

- **GIVEN** a source moves from engineering cumulative to daily at an approved day boundary
- **WHEN** cutover is applied
- **THEN** only one energy authority contributes for each period and missing continuity remains explicit
