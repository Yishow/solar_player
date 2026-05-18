## ADDED Requirements

### Requirement: Describe region fields with a schema-aware inspector contract

The system SHALL describe display editor region fields with a schema-aware inspector contract so the UI can render typed controls consistently.

#### Scenario: Inspector renders mixed field types

- **WHEN** a region schema includes text, number, toggle, select, or array-backed fields
- **THEN** the inspector renders those typed controls from the schema
- **AND** the field values remain bound to the editable draft

##### Example: Highlight rail region renders text and array-backed controls

- **GIVEN** a region schema includes a text label, numeric geometry fields, and array-backed highlight items
- **WHEN** the operator selects that region in the editor
- **THEN** the inspector renders the correct typed controls for each field
- **AND** editing those controls updates the current draft binding

### Requirement: Enforce typed inspector constraints during editing

The system SHALL enforce typed inspector constraints such as ranges, required values, or compatibility checks during editing.

#### Scenario: Operator enters invalid field value

- **WHEN** the operator enters a value outside the schema constraints
- **THEN** the inspector surfaces that invalid state
- **AND** the invalid value does not silently appear as valid content

##### Example: Negative width is rejected by the inspector

- **GIVEN** a geometry field requires a non-negative width
- **WHEN** the operator enters `-24` for that width
- **THEN** the inspector marks the field invalid
- **AND** the value is not silently treated as an acceptable saved width
