## ADDED Requirements

### Requirement: Provide page-specific authoring coverage for supported display pages

The system SHALL provide page-specific authoring coverage for supported display pages that currently stop at preview-only coverage.

#### Scenario: Operator opens a page that previously had preview-only coverage

- **WHEN** the operator switches to a supported display page in `Display Pages Editor`
- **THEN** the editor SHALL expose page-specific editable regions and typed fields for that page
- **AND** the operator SHALL NOT see only a generic fallback message when page-specific authoring support now exists

### Requirement: Keep page-specific authoring bound to the current draft session

The system SHALL keep new page-specific authoring controls bound to the current display-page draft session.

#### Scenario: Operator edits a page-specific field

- **WHEN** the operator updates a page-specific field from the inspector
- **THEN** the change SHALL remain part of the current draft session
- **AND** it SHALL participate in the existing save, reset, and preview-binding workflows

##### Example: Sustainability card title stays in the active draft

- **GIVEN** the operator is editing `sustainability` in `Display Pages Editor`
- **WHEN** they update a page-specific card title field from the inspector
- **THEN** the new title remains attached to the current draft session
- **AND** preview, save, and reset flows all reflect that draft-scoped value instead of dropping back to the previous published state
