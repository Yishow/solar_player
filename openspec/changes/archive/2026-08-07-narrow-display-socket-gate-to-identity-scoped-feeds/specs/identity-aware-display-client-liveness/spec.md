## MODIFIED Requirements

### Requirement: Reject invalid identity and heartbeat payloads safely

An invalid or revoked credential SHALL NOT create a Device registry entry. An invalid heartbeat payload from an authenticated connection SHALL be ignored without replacing the previous valid state.

A heartbeat received from an unidentified session SHALL be discarded. It SHALL NOT create a Device registry entry, SHALL NOT update any existing entry, and SHALL NOT change the derived liveness state of any Device.

#### Scenario: Credential is revoked while connected

- **WHEN** the Client sends its next heartbeat after credential revocation
- **THEN** the Server rejects and disconnects the Socket
- **AND** other valid Device connections remain unaffected

#### Scenario: Heartbeat from an unidentified session is discarded

- **WHEN** an unidentified session emits a heartbeat
- **THEN** the Server SHALL discard it without creating or updating a Device registry entry
- **AND** the session SHALL remain connected

##### Example: Unpaired browser never appears in Device Status

- **GIVEN** a browser without a Device Credential has an unidentified session and emits heartbeats
- **WHEN** a trusted operator reads the display client liveness data
- **THEN** that browser SHALL NOT appear among the listed clients
- **AND** the summary counts SHALL be unchanged by its heartbeats
