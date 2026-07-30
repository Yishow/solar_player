## ADDED Requirements

### Requirement: Server-authenticated Device Identity owns liveness state

Display Client liveness SHALL use the Device Identity established during Socket authentication. Socket ID SHALL identify only a child connection, and client-supplied identity fields SHALL NOT create or select a Device entry.

#### Scenario: Heartbeat claims another clientId

- **WHEN** an authenticated Device heartbeat includes a clientId different from its credential-bound Device
- **THEN** the Server ignores the claimed identity
- **AND** updates only the credential-bound Device or rejects the invalid payload
