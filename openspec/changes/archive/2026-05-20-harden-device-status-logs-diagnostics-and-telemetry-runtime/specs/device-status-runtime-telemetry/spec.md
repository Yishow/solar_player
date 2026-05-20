## ADDED Requirements

### Requirement: Show only trusted runtime telemetry in Device Status

The system SHALL show only measured runtime telemetry or an explicit unavailable state in `Device Status`.

#### Scenario: Telemetry source is unavailable

- **WHEN** a `Device Status` telemetry card cannot be backed by a real runtime measurement
- **THEN** the page SHALL show an explicit unavailable or unsupported state for that card
- **AND** it SHALL NOT substitute a hard-coded telemetry value as if it were measured data

##### Example: Temperature is unavailable instead of invented

- **GIVEN** the server has no trusted device temperature source
- **WHEN** the operator opens `Device Status`
- **THEN** the temperature card shows an unavailable state
- **AND** the page does not display an invented fixed temperature such as `52°C`
