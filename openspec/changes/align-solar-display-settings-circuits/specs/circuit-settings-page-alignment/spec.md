## ADDED Requirements

### Requirement: Align the circuit settings page as a CRUD-focused standalone change

The implementation SHALL align `/settings/circuits` as a CRUD-focused standalone change.

#### Scenario: The circuit settings change starts

- **WHEN** this change begins
- **THEN** it only covers `/settings/circuits`
- **AND** it treats form/list/action hierarchy and CRUD usability as the primary alignment target

##### Example:

- **GIVEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html` is the prototype source
- **WHEN** this change is applied
- **THEN** it maps only to `/settings/circuits`
- **AND** no MQTT or monitoring page is included in the same change

### Requirement: Preserve circuit CRUD and message behavior

The implementation SHALL preserve create, update, delete, load failure, and message/error behavior for `/settings/circuits`.

#### Scenario: Circuit CRUD succeeds or fails

- **WHEN** an operator creates, edits, deletes, or reloads circuit rows
- **THEN** the route keeps the existing functional contract
- **AND** the UI continues to surface success and failure states clearly

##### Example:

- **GIVEN** a create action fails at the server
- **WHEN** the operator submits the form
- **THEN** the route shows a visible failure outcome instead of silently mutating only local state
- **AND** the list and form remain usable for recovery
