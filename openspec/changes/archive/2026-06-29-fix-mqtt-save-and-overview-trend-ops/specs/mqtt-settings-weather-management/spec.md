## ADDED Requirements

### Requirement: Persist MQTT and weather settings before broker reconnect outcome
The system SHALL persist MQTT broker settings and weather settings before any reconnect attempt determines the API result.

#### Scenario: Reconnect fails after settings are saved
- **WHEN** an operator saves MQTT or weather settings
- **AND** the background broker reconnect attempt fails
- **THEN** the save request SHALL still succeed with the persisted settings payload
- **AND** a later settings read SHALL return the saved values

#### Scenario: Save contract stays narrow to persistence
- **WHEN** an operator saves MQTT or weather settings while the broker is unhealthy
- **THEN** the system SHALL NOT discard the saved settings because of the reconnect failure
- **AND** broker-health feedback SHALL remain visible through existing diagnostics rather than the save response itself
