## MODIFIED Requirements

### Requirement: Fail closed when Device context is unavailable

The system SHALL return explicit unpaired, revoked, disabled, group-disabled, group-missing, or profile-missing states. It SHALL NOT fall back to cl, kn, or a global factory scope.

Each such failure SHALL additionally be recorded in a bounded in-process unpaired display access aggregate, so that management surfaces can observe that display machines are being denied. Recording SHALL NOT change the response status, error code, or body, and a failure to record SHALL NOT prevent the denial response from being returned.

#### Scenario: Unpaired Client requests a Story

- **WHEN** a Client without a Device Credential requests a formal runtime Story
- **THEN** the system returns 401 with code device_unpaired
- **AND** no Site-specific Story payload is returned

#### Scenario: Denial is recorded without changing the response

- **WHEN** a Device context resolution failure produces a denial response
- **THEN** the system SHALL record one occurrence with that error code and the requested route path
- **AND** the denial response SHALL be identical to the response produced before recording existed

#### Scenario: Recording failure does not suppress the denial

- **WHEN** recording an occurrence raises an error
- **THEN** the system SHALL still return the denial response
- **AND** the error SHALL NOT propagate as an unhandled failure
