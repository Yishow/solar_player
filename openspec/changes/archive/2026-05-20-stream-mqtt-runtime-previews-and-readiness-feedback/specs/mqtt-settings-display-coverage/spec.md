## MODIFIED Requirements

### Requirement: Evaluate MQTT settings coverage against display metric requirements

The system SHALL evaluate `MQTT Settings` coverage against display metric requirements so operators can see which required metrics are mapped, missing, or invalid, and the management surface SHALL keep that feedback aligned with the latest available runtime topic state.

#### Scenario: Required display metric mapping is missing

- **WHEN** a display metric required by `Overview` or `Solar` has no valid topic mapping
- **THEN** `MQTT Settings` shows that missing or invalid mapping as a readiness finding
- **AND** the finding identifies which display story is affected
- **AND** the operator can distinguish between a static mapping gap and a mapped topic that is currently idle or not receiving runtime values
