## ADDED Requirements

### Requirement: Compute reset and diff tools against seed and current draft state

The system SHALL compute reset and diff tools against seed and current draft state so operators can see what changed and restore prior values quickly.

#### Scenario: Field differs from seed

- **WHEN** a field value in the current draft differs from its seed value
- **THEN** the inspector marks that field as changed
- **AND** the operator can reset that field or region to the seed-backed value

##### Example: Inspector marks a changed hero width

- **GIVEN** the seed width for a hero region is `642`
- **WHEN** the operator changes the current draft width to `700`
- **THEN** the inspector marks that width field as changed
- **AND** the operator can reset it back to the seed-backed width

### Requirement: Keep reset and diff tools scoped to the current page draft

The system SHALL keep reset and diff tools scoped to the current page draft unless a broader comparison is explicitly requested.

#### Scenario: Region reset affects only current page draft

- **WHEN** the operator resets a region from the inspector
- **THEN** only the current page draft region is restored
- **AND** other page drafts are unchanged

##### Example: Resetting Overview hero copy does not touch Solar draft

- **GIVEN** both `overview` and `solar` drafts contain unsaved changes
- **WHEN** the operator resets the `Overview Hero Copy` region
- **THEN** only the current `overview` region returns to seed values
- **AND** the `solar` draft remains untouched
