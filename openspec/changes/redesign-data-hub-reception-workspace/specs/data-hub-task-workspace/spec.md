## MODIFIED Requirements

### Requirement: DataHub starts source tasks from received-data inventory
<!-- requirement-id: U1-R8 -->

The DataHub source workspace SHALL expose the M1 observed-data catalog and M2 add-from-received-data action before requiring a technical mapping form. Existing topic subscriptions SHALL not be presented as an inventory of all available meters. The task SHALL preserve concrete site and return context; missing permissions or scope setup SHALL be resolved inline where authorized. Configured sources and observed data SHALL be separately named, directly reachable workspace views. The normal create action SHALL start from received evidence, with manual technical configuration as an explicit advanced alternative.

#### Scenario: KN task entry
<!-- scenario-id: U1-R8-S01 -->

- **GIVEN** the active workspace is KN
- **WHEN** the user selects add meter from received data
- **THEN** M1/M2 opens with KN and the current approved connection without asking to copy topic strings

#### Scenario: No mappings yet
<!-- scenario-id: U1-R8-S02 -->

- **GIVEN** approved discovery observations exist but zero generic mappings exist
- **WHEN** the user opens sources
- **THEN** unmapped candidates are visible and selectable instead of an empty form demanding a metric key

#### Scenario: Existing source is silent
<!-- scenario-id: U1-R8-S03 -->

- **GIVEN** a configured source has no observations in the current capture window
- **WHEN** the user reviews the workspace
- **THEN** it remains configured and is shown as not observed in that window, not deleted or absent equipment

## ADDED Requirements

### Requirement: Workspace navigation preserves scope and stable selection
<!-- requirement-id: DHR-R1 -->

The workspace SHALL keep supported scope, search, filter, view and selection state addressable without storing secrets or raw samples in URLs. Back, Forward, refresh and inspector close SHALL have consistent outcomes. Live updates SHALL not reorder the active selection or replace its evidence without an explicit review action.

#### Scenario: Return to a filtered list
<!-- scenario-id: DHR-R1-S01 -->

- **GIVEN** a KN issue-filtered search opened one source
- **WHEN** the operator closes the inspector or presses Back
- **THEN** the same scoped search and logical scroll position return

#### Scenario: Late response from old site
<!-- scenario-id: DHR-R1-S02 -->

- **GIVEN** a CL request is pending and the operator switches to KN
- **WHEN** the CL response arrives after the KN request
- **THEN** no CL payload, candidate, count or draft appears in the KN view

#### Scenario: Direct link closes safely
<!-- scenario-id: DHR-R1-S03 -->

- **GIVEN** the user entered a direct source bookmark without a list history entry
- **WHEN** the inspector is closed
- **THEN** selection is cleared in place rather than navigating away to an unrelated previous website

#### Scenario: New observation while selecting
<!-- scenario-id: DHR-R1-S04 -->

- **GIVEN** a candidate and sample revision are selected
- **WHEN** new traffic or a new schema arrives
- **THEN** the selected identity stays stable and any evidence change requires deliberate review

### Requirement: Source families preserve managed reuse and explicit power onboarding
<!-- requirement-id: DHR-R5 -->

The workspace SHALL classify configured and observed sources using registered contracts and reviewed site metadata, not solely topic spelling. Standard Solar summary and whole-zone canonical sources SHALL be reused through SolarSourceAdapter. Power raw channels MAY enter reviewed M2 onboarding; publisher virtual sums and control/health messages SHALL remain non-meter evidence. Nonstandard Solar topics MAY retain explicitly reviewed generic use under non-owned metric identities; a blanket ban on all solar-prefixed topics SHALL NOT replace ownership checks.

#### Scenario: Solar data already ingested
<!-- scenario-id: DHR-R5-S01 -->

- **GIVEN** the standard solar/KN/summary is observed and owned by the adapter
- **WHEN** the user selects it in received data
- **THEN** the action opens or reuses the managed source without creating a competing generic canonical writer

#### Scenario: Raw and calculated duplicates
<!-- scenario-id: DHR-R5-S02 -->

- **GIVEN** one physical counter appears as raw and within a publisher virtual total
- **WHEN** the workspace counts or selects meters
- **THEN** only reviewed physical channels count as meters and the virtual aggregate is not another accounting input

#### Scenario: KN reserved name only
<!-- scenario-id: DHR-R5-S03 -->

- **GIVEN** a tag is reserved in the KN plan but has no approved source item
- **WHEN** onboarding opens
- **THEN** the planned row is labeled not configured and activation is unavailable without inserting a real source or fabricated zero
