## ADDED Requirements

### Requirement: Protect management mutation APIs with a shared access boundary

The system SHALL protect management mutation APIs with a shared access boundary instead of exposing them to unrestricted cross-origin callers by default.

#### Scenario: Untrusted origin attempts a mutation

- **WHEN** an untrusted origin or unauthenticated client attempts to call a management mutation endpoint
- **THEN** the server rejects the request according to the configured management access policy
- **AND** read-only diagnostics remain independently configurable

##### Example: Cross-origin request cannot update MQTT settings

- **GIVEN** the management origin policy does not trust the caller
- **WHEN** the caller sends a `PUT` request to a settings mutation endpoint
- **THEN** the request is denied
- **AND** the server does not apply the mutation
