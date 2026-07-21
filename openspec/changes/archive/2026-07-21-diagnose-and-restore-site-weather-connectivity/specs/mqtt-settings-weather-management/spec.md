## MODIFIED Requirements

### Requirement: Support manual weather refresh

The system SHALL allow trusted operators to manually trigger a live weather refresh from MQTT Settings and SHALL distinguish the result of that upstream attempt from cached or stale playback data.

#### Scenario: Operator triggers manual refresh successfully

- **WHEN** the operator clicks the "Refresh Now" button and CWA returns valid current weather
- **THEN** the system SHALL clear the server cache and complete one fresh CWA request
- **AND** the page SHALL display an upstream-success result for that attempt immediately

#### Scenario: Manual refresh cannot reach CWA

- **WHEN** the operator clicks the "Refresh Now" button and the upstream request fails
- **THEN** the page SHALL display the bounded diagnostic code, failure stage, retryability, and stale-data availability for that attempt
- **AND** it SHALL NOT replace the failure with a generic delayed-data message
- **AND** if existing stale weather data remains visible, it SHALL be explicitly labelled as stale
