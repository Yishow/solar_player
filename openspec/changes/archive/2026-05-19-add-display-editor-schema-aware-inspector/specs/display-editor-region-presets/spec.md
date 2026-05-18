## ADDED Requirements

### Requirement: Keep region presets opt-in and scoped by compatibility

The system SHALL keep region presets opt-in and limited to compatible region types.

#### Scenario: Compatible preset is applied

- **WHEN** the operator applies a preset to a compatible region type
- **THEN** the region receives the preset field values
- **AND** incompatible fields are not introduced

##### Example: KPI preset applies to another KPI region

- **GIVEN** a preset is defined for KPI-style regions with the same field schema
- **WHEN** the operator applies that preset to a compatible KPI region
- **THEN** the target region receives the preset field values
- **AND** no unrelated fields are injected into the region

### Requirement: Surface incompatible presets before they overwrite content

The system SHALL block or clearly surface incompatible presets before they overwrite region content.

#### Scenario: Incompatible preset is selected

- **WHEN** the operator selects a preset that is not compatible with the current region
- **THEN** the preset is blocked or marked incompatible
- **AND** the current draft content remains unchanged

##### Example: Hero copy preset cannot apply to a connector region

- **GIVEN** the current region is a connector with geometry-only fields
- **WHEN** the operator selects a hero-copy preset that expects text fields
- **THEN** the preset is blocked as incompatible
- **AND** the connector draft content remains unchanged
