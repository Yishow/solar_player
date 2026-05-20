## MODIFIED Requirements

### Requirement: Describe region fields with a schema-aware inspector contract

The system SHALL describe display editor region fields with a schema-aware inspector contract so the UI can render typed controls consistently, and supported display pages SHALL use that contract for their page-specific authoring controls instead of stopping at preview-only coverage.

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
