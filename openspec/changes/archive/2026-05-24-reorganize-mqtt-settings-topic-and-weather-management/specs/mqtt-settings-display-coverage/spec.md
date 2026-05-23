## MODIFIED Requirements

### Requirement: Surface MQTT coverage findings inside MQTT Settings

The system SHALL surface display coverage findings inside `MQTT Settings` rather than only in a backend-only diagnostic response, and it SHALL keep those findings inside the editable topic overview workspace.

#### Scenario: Operator reviews broker and mapping page

- **WHEN** the operator opens `MQTT Settings`
- **THEN** the page can show current mapping coverage for display requirements
- **AND** blocking findings remain distinguishable from warnings
- **AND** the operator can inspect and fix the affected topic rows without leaving that same topic overview workspace
