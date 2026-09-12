## MODIFIED Requirements

### Requirement: Display editor draft config hydration avoids repeated full-object work

The system SHALL hydrate draft display page config without requiring full config stringify comparison on every render. Dirty tracking, save, undo, redo, reset paths, fallback policy, conflict handling, and validation state SHALL remain correct. A visible seed fallback without an authoritative server envelope SHALL be read-only until successful retry establishes the active draft baseline.

#### Scenario: Draft dirty state updates through editor actions

- **WHEN** an operator edits a field, resets a field, saves a draft, receives a save conflict, undoes, or redoes an editor change after its baseline is ready
- **THEN** the editor SHALL update dirty state according to the applicable draft-governance contract
- **AND** it SHALL NOT require a full JSON serialization of the current and last-loaded config on every render to decide that state

#### Scenario: Draft config failure keeps seed fallback visible

- **WHEN** draft config hydration fails for the selected page
- **THEN** the editor SHALL keep the seed fallback visible for inspection with its fallback policy and error message
- **AND** draft mutation and save SHALL remain disabled until retry supplies an authoritative envelope
- **AND** the operator SHALL have a retry action without losing an already existing valid local draft
