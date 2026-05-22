## ADDED Requirements

### Requirement: Provide an operator-visible runbook for device diagnostics and safe operations
The system SHALL provide an operator-visible runbook for device diagnostics and safe operations so operators know which checks are safe in-app and which actions require host-level intervention.

#### Scenario: Operator opens Device Status during a degraded runtime incident
- **WHEN** the operator reviews device diagnostics during a degraded runtime incident
- **THEN** the system SHALL identify the safe in-app diagnostic actions that can be taken
- **AND** it SHALL identify the escalation path for host-level intervention when an in-app action is not supported

##### Example: Restart guidance points to the host runbook
- **GIVEN** the operator wants to recover the player process after diagnostics indicate a host-level issue
- **WHEN** the operator checks the safe-ops guidance
- **THEN** the guidance points to the host-level restart runbook
- **AND** it does not imply that the app itself performed a device reboot
