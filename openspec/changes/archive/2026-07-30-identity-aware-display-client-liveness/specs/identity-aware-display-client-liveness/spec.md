## ADDED Requirements

### Requirement: Aggregate Socket Connections under a stable Device Identity

The Server SHALL authenticate each display Socket with the Device Credential and SHALL maintain liveness by Device Identity with zero or more child connections. A heartbeat SHALL NOT be able to replace the authenticated identity.

#### Scenario: One Device reconnects before the old Socket closes

- **WHEN** the same valid credential creates a second same-source connection
- **THEN** both connections appear under one Device
- **AND** the latest valid heartbeat supplies the Device's current route, page, and playback state

#### Scenario: One child connection disconnects

- **WHEN** one of two active connections for a Device disconnects
- **THEN** the remaining connection keeps the Device online
- **AND** the Device summary retains its last valid state

### Requirement: Detect sustained duplicate identity across sources

The Server SHALL set duplicateIdentity=true when the same credential has active connections from different normalized source fingerprints for at least 30 seconds. Same-source reconnects SHALL NOT trigger the warning.

#### Scenario: Different-source overlap crosses the threshold

- **WHEN** two different-source connections for one credential remain active for 30 seconds
- **THEN** the Device liveness summary reports duplicateIdentity=true
- **AND** it records the duplicate detection time without exposing the credential

##### Example: duplicate warning boundaries

| Connections | Overlap | Warning |
| --- | --- | --- |
| same source | 60 seconds | false |
| different sources | 29.999 seconds | false |
| different sources | 30 seconds | true |

### Requirement: Reject invalid identity and heartbeat payloads safely

An invalid or revoked credential SHALL NOT create a Device registry entry. An invalid heartbeat payload from an authenticated connection SHALL be ignored without replacing the previous valid state.

#### Scenario: Credential is revoked while connected

- **WHEN** the Client sends its next heartbeat after credential revocation
- **THEN** the Server rejects and disconnects the Socket
- **AND** other valid Device connections remain unaffected
