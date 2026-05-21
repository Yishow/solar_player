## MODIFIED Requirements

### Requirement: Describe region fields with a schema-aware inspector contract

The system SHALL describe display editor region fields with a schema-aware inspector contract so the UI can render typed controls consistently, and supported display pages SHALL use that contract for their page-specific authoring controls instead of stopping at preview-only coverage. Card rail child cards SHALL also use template-aware typed controls instead of raw array item editing.

#### Scenario: Inspector renders mixed field types

- **WHEN** a region schema includes text, number, toggle, select, or array-backed fields
- **THEN** the inspector renders those typed controls from the schema
- **AND** the field values remain bound to the editable draft
- **AND** supported page-specific authoring flows use the same inspector contract instead of bypassing it with page-local special cases

##### Example: Highlight rail region renders text and array-backed controls

- **GIVEN** a region schema includes a text label, numeric geometry fields, and array-backed highlight items
- **WHEN** the operator selects that region in the editor
- **THEN** the inspector renders the correct typed controls for each field
- **AND** editing those controls updates the current draft binding

#### Scenario: Inspector swaps field sets when a rail card template changes

- **WHEN** the operator selects a rail card and changes its template
- **THEN** the inspector renders the typed fields defined for the new template
- **AND** fields that belong only to the previous template stop appearing as editable controls

##### Example: Household-equivalent card shows template-specific fields

- **GIVEN** a rail card uses the `household-equivalent` template
- **WHEN** the operator selects that card
- **THEN** the inspector shows fields such as eyebrow, supporting line, disclaimer, and calculation-profile metadata
- **AND** the operator does not need to edit those values through a generic JSON row

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
