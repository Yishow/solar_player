## ADDED Requirements

### Requirement: Evaluate MQTT settings coverage against display metric requirements

The system SHALL evaluate `MQTT Settings` coverage against display metric requirements so operators can see which required metrics are mapped, missing, or invalid.

#### Scenario: Required display metric mapping is missing

- **WHEN** a display metric required by `Overview` or `Solar` has no valid topic mapping
- **THEN** `MQTT Settings` shows that missing or invalid mapping as a readiness finding
- **AND** the finding identifies which display story is affected

### Requirement: Surface MQTT coverage findings inside MQTT Settings

The system SHALL surface display coverage findings inside `MQTT Settings` rather than only in a backend-only diagnostic response.

#### Scenario: Operator reviews broker and mapping page

- **WHEN** the operator opens `MQTT Settings`
- **THEN** the page can show current mapping coverage for display requirements
- **AND** blocking findings remain distinguishable from warnings
