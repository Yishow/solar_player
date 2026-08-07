## MODIFIED Requirements

### Requirement: Classify socket sessions as playback-safe or management-trusted
The system SHALL classify each Socket.IO session at handshake time so the server can distinguish playback-safe listeners from trusted management listeners.

A playback-safe handshake that does not resolve a valid Display Client Context SHALL be classified as unidentified rather than rejected. An unidentified session SHALL be allowed to connect and SHALL receive only the allowlisted feeds that carry no Device identity and no Site Scope. An unidentified session SHALL NEVER be classified as management-trusted.

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

## ADDED Requirements

### Requirement: Restrict unidentified socket sessions to an explicit feed allowlist

The system SHALL deliver socket events to unidentified sessions only when the event appears on an explicit allowlist of feeds that carry no Device identity and no Site Scope. The allowlist SHALL contain the Server Time Signal. Every other broadcast SHALL be delivered only to identified sessions, so that adding a new broadcast without changing the allowlist SHALL NOT reach unidentified sessions.

An event emitted by an unidentified session that requires a Display Client Context SHALL be ignored without terminating that connection.

#### Scenario: Unidentified session receives only the allowlisted feed

- **WHEN** an unidentified session is connected and the server broadcasts its runtime feeds
- **THEN** the session SHALL receive the Server Time Signal
- **AND** the session SHALL NOT receive live metrics, circuit metrics, MQTT status, display sync, circuit settings updates, playback settings updates, image updates, or any management-only event

##### Example: Feed delivery by session class

| Feed | Unidentified | Identified playback-safe | Management-trusted |
| ---- | ------------ | ------------------------ | ------------------ |
| Server Time Signal | delivered | delivered | delivered |
| live metrics update | withheld | delivered | delivered |
| circuit metrics update | withheld | delivered | delivered |
| MQTT status | withheld | delivered | delivered |
| display sync | withheld | delivered | delivered |
| management-only diagnostics | withheld | withheld | delivered |

#### Scenario: A newly added broadcast does not reach unidentified sessions

- **WHEN** a new broadcast feed is added without being placed on the allowlist
- **THEN** unidentified sessions SHALL NOT receive it

#### Scenario: Identified sessions are unaffected

- **WHEN** a session presenting a valid Device Credential connects
- **THEN** it SHALL receive exactly the feeds it received before unidentified sessions were permitted to connect
