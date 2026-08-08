## MODIFIED Requirements

### Requirement: Classify socket sessions as playback-safe or management-trusted
The system SHALL classify each Socket.IO session at handshake time so the server can distinguish playback-safe listeners from trusted management listeners.

A playback-safe handshake that does not resolve a valid Display Client Context SHALL be classified as unidentified rather than rejected. An unidentified session SHALL be allowed to connect and SHALL receive only the allowlisted feeds that carry no Device identity and no Site Scope. An unidentified session SHALL NEVER be classified as management-trusted.

Management origin classification and connection identification are separate determinations and SHALL be represented separately. Management origin classification SHALL yield only playback-safe or management-trusted; it SHALL NOT be able to yield unidentified. The unidentified class SHALL be assigned only by Display Client Context resolution, and only to a session that management origin classification already placed in playback-safe.

#### Scenario: Playback session connects without management credentials
- **WHEN** a socket client connects without a trusted management origin or valid management access token
- **THEN** the server SHALL classify that session as playback-safe
- **AND** it SHALL only receive the socket feeds allowed for playback-safe sessions

##### Example: Public playback display gets runtime-safe bootstrap only
- **GIVEN** a display runtime session connects from an untrusted non-management client
- **WHEN** the socket handshake completes
- **THEN** the server classifies the session as playback-safe
- **AND** the connection is not subscribed to management-only diagnostic events

#### Scenario: Handshake without a valid Device Credential is classified as unidentified

- **WHEN** a playback-safe handshake presents no Device Credential, or one that is revoked, disabled, or resolves to no Device
- **THEN** the server SHALL classify that session as unidentified
- **AND** the connection SHALL be established rather than refused

#### Scenario: Credential resolution failure fails toward fewer feeds

- **WHEN** resolving a Display Client Context raises an unexpected error during handshake
- **THEN** the server SHALL classify that session as unidentified
- **AND** the server SHALL NOT classify it as an identified session

#### Scenario: Management origin classification never yields unidentified

- **WHEN** management origin classification runs on a handshake that presents no Device Credential
- **THEN** it SHALL yield playback-safe
- **AND** it SHALL NOT yield unidentified, which only Display Client Context resolution assigns

##### Example: Where each class comes from

| Class | Assigned by |
| ----- | ----------- |
| `management-trusted` | management origin classification |
| `playback-safe` | management origin classification |
| `unidentified` | Display Client Context resolution, over a playback-safe session |
