## ADDED Requirements

### Requirement: Display editor extension surfaces use Traditional Chinese primary labels

The system SHALL render primary operation labels, field labels, status text, and empty states in Traditional Chinese for Display Pages Editor extension surfaces, including media effect controls, page freeform object controls, asset picker controls, and Shared Shell Decorations authoring controls.

#### Scenario: Operator edits media effects

- **WHEN** the operator opens effect controls for a supported hero or media surface
- **THEN** the effect field labels and options are shown in Traditional Chinese
- **AND** English is not required to understand the operation

##### Example: Blur and edge fade labels are localized

- **GIVEN** the Overview hero media effect controls are visible
- **WHEN** the inspector renders those controls
- **THEN** blur, edge fade, bottom fade, opacity, direction, width, height, and amount labels are shown as Traditional Chinese operation labels

### Requirement: Shell decoration authoring labels are localized without changing technical identifiers

The system SHALL localize visible Shared Shell Decorations authoring labels while preserving route paths, object IDs, config keys, API payload keys, and other technical identifiers.

#### Scenario: Operator edits a shell object

- **WHEN** the operator selects a shell decoration object
- **THEN** mount, type, geometry, style, asset, save, and publish controls use Traditional Chinese labels
- **AND** object IDs and version numbers remain visible as technical identifiers when needed

##### Example: Shell line controls are localized while ID remains literal

- **GIVEN** a shell line object with id `header-line-1` is selected
- **WHEN** the shell decoration inspector renders
- **THEN** controls for header/footer mount, line type, left, top, width, height, z-index, opacity, thickness, and color use Traditional Chinese labels
- **AND** `header-line-1` remains visible as the technical object identifier
