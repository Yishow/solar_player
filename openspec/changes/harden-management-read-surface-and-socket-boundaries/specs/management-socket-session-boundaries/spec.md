## ADDED Requirements

### Requirement: Classify socket sessions as playback-safe or management-trusted
The system SHALL classify each Socket.IO session at handshake time so the server can distinguish playback-safe listeners from trusted management listeners.

#### Scenario: Playback session connects without management credentials
- **WHEN** a socket client connects without a trusted management origin or valid management access token
- **THEN** the server SHALL classify that session as playback-safe
- **AND** it SHALL only receive the socket feeds allowed for playback-safe sessions

##### Example: Public playback display gets runtime-safe bootstrap only
- **GIVEN** a display runtime session connects from an untrusted non-management client
- **WHEN** the socket handshake completes
- **THEN** the server classifies the session as playback-safe
- **AND** the connection is not subscribed to management-only diagnostic events

### Requirement: Keep management-only socket events scoped to trusted sessions
The system SHALL emit management-only socket events only to trusted management sessions, while continuing to expose playback-safe events to both playback and management sessions.

#### Scenario: Sensitive diagnostic event is withheld from playback-safe sessions
- **WHEN** the server emits a management-only diagnostic event
- **THEN** only trusted management sessions SHALL receive it
- **AND** playback-safe sessions SHALL remain connected without receiving that event

##### Example: System error stays management-only
- **GIVEN** one trusted management session and one playback-safe session are connected
- **WHEN** the server emits a `system:error` notification
- **THEN** the trusted management session receives the notification
- **AND** the playback-safe session does not receive it
