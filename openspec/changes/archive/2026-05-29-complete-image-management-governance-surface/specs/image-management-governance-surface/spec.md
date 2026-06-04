## ADDED Requirements

### Requirement: Support structured governance for one asset to many playlist entries

The system SHALL support structured governance for one selected asset to many playlist entries in `Image Management`.

#### Scenario: Selected asset is used by multiple playlist rows

- **WHEN** an operator selects an asset that is referenced by multiple playlist rows
- **THEN** the page SHALL identify that one-to-many relationship explicitly
- **AND** the operator SHALL be able to review and govern each relevant playlist row without relying on an implicit first-row default only

#### Scenario: Operator edits playlist runtime fields for one selected row

- **WHEN** the operator chooses a specific playlist row for the selected asset
- **THEN** the page SHALL scope runtime fields such as title, fallback mode, duration, order, and enabled state to that chosen row

### Requirement: Provide actionable editor handoff for focal editing instead of disabled placeholders

The system SHALL provide an actionable editor handoff for focal editing from `Image Management`.

#### Scenario: Operator wants to adjust focus or crop for a selected asset

- **WHEN** the operator triggers focal editing from the selected asset panel
- **THEN** the page SHALL launch a real workflow with selected-asset context
- **AND** it SHALL NOT leave the action as a disabled placeholder-only control

#### Scenario: Editor handoff keeps governance and authoring responsibilities distinct

- **WHEN** the operator follows the focal-editing handoff
- **THEN** the target workflow SHALL continue asset authoring in the editor workspace
- **AND** `Image Management` SHALL remain the governance surface for references and playlist runtime controls

### Requirement: Present references and delete blockers as structured triage surfaces

The system SHALL present references and delete blockers as structured triage surfaces in `Image Management`.

#### Scenario: Selected asset has live and draft references

- **WHEN** the selected asset is referenced by display pages or slideshow entries
- **THEN** the page SHALL distinguish stage, target, and reference kind in a structured surface
- **AND** the operator SHALL be able to tell whether the blocker comes from live runtime, draft configuration, or slideshow governance

#### Scenario: Selected asset cannot be deleted safely

- **WHEN** deletion is blocked by existing references or runtime usage
- **THEN** the page SHALL identify the blocking reason and the next governance step
- **AND** it SHALL NOT rely only on a generic refusal message
