## ADDED Requirements

### Requirement: Carry Profile rollout state in Device heartbeats

Device heartbeats SHALL include desiredVersion, appliedVersion, and updateState after Profile rollout is enabled. The liveness snapshot SHALL retain the last valid rollout state for offline diagnostics.

#### Scenario: Device goes offline while waiting

- **WHEN** a Device last reports waiting and then becomes offline
- **THEN** management shows offline as liveness and preserves waiting as the last rollout state
- **AND** it does not count the Device as applied

##### Example: Waiting Version 8 loses its connection

- **GIVEN** a Device reports desiredVersion=8, appliedVersion=7, and updateState=waiting
- **WHEN** its connected count reaches zero
- **THEN** management classifies its liveness as offline
- **AND** retains appliedVersion=7 and the last waiting state for diagnostics
