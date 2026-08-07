## MODIFIED Requirements

### Requirement: Protect management mutation APIs with a shared access boundary

The system SHALL protect management mutation APIs with a shared access boundary instead of exposing them to unrestricted cross-origin callers by default. When the management password gate is enabled, the shared access boundary SHALL additionally require a valid unexpired management session, or a valid `MANAGEMENT_ACCESS_TOKEN`, before granting access. A trusted origin alone SHALL NOT be sufficient while the gate is enabled. When the gate is disabled, the boundary SHALL continue to allow trusted management callers without a password session, but SHALL still reject untrusted callers. Password gate configuration mutations SHALL follow this boundary in both gate states.

#### Scenario: Untrusted origin attempts a mutation

- **WHEN** an untrusted origin or unauthenticated client attempts to call a management mutation endpoint
- **THEN** the server rejects the request according to the configured management access policy
- **AND** read-only diagnostics remain independently configurable

##### Example: Cross-origin request cannot update MQTT settings

- **GIVEN** the management origin policy does not trust the caller
- **WHEN** the caller sends a `PUT` request to a settings mutation endpoint
- **THEN** the request is denied
- **AND** the server does not apply the mutation

#### Scenario: Trusted origin without a session cannot mutate while the gate is enabled

- **GIVEN** the management password gate is enabled
- **WHEN** a trusted-origin caller without a valid management session sends a management mutation request
- **THEN** the server SHALL deny the request with the management access denied envelope
- **AND** the server SHALL NOT apply the mutation

##### Example: Same-host browser cannot change playback settings while locked

- **GIVEN** the management password gate is enabled and the caller is a browser on the server host with no management session
- **WHEN** the caller sends a `PUT` request to a playback settings mutation endpoint
- **THEN** the request is denied
- **AND** the stored playback settings remain unchanged

#### Scenario: Untrusted caller cannot bootstrap a disabled password gate

- **GIVEN** the management password gate is disabled
- **WHEN** an untrusted origin or remote caller sends `PUT /api/management-auth/password` with `enabled: true`
- **THEN** the server returns the management access denied envelope
- **AND** the password gate remains disabled

#### Scenario: Trusted caller can bootstrap a disabled password gate

- **GIVEN** the management password gate is disabled
- **WHEN** a trusted same-host, configured-origin, or `MANAGEMENT_ACCESS_TOKEN` caller sends `PUT /api/management-auth/password` with a valid new password
- **THEN** the server enables the password gate
- **AND** the existing password configuration response is returned
