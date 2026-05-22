## ADDED Requirements

### Requirement: Display clients emit periodic liveness heartbeats

The playback shell SHALL emit a `client:heartbeat` event over the existing Socket.IO connection at a fixed interval while the playback shell is mounted. Each heartbeat SHALL carry the client session class, the current route path, the current playback page key (or null when none is active), the `isPlaying` flag, the `isIdle` flag, the viewport width and height, and the client-side ISO timestamp.

#### Scenario: Heartbeat emitted on a fixed interval

- **WHEN** the playback shell has been mounted for longer than one heartbeat interval and the socket is connected
- **THEN** the client SHALL emit a `client:heartbeat` event carrying route path, current page key, `isPlaying`, `isIdle`, viewport size, and a client timestamp

#### Scenario: Heartbeat emitted immediately on playback page change

- **WHEN** the active playback page key changes
- **THEN** the client SHALL emit a `client:heartbeat` event reflecting the new page key without waiting for the next interval tick

#### Scenario: No heartbeat while socket is disconnected

- **WHEN** the Socket.IO connection is not in the connected state
- **THEN** the client SHALL NOT emit `client:heartbeat` events until the connection is re-established

### Requirement: Server maintains a per-client liveness registry

The server SHALL maintain an in-memory registry of connected display clients keyed by socket id. The registry SHALL record the session class, remote address, connected timestamp, last-seen timestamp, current route path, current page key, `isPlaying`, and `isIdle`. The registry SHALL update the matching entry on each received `client:heartbeat`, and SHALL remove the entry when the socket disconnects.

#### Scenario: Registry entry created on connection and updated on heartbeat

- **WHEN** a client connects and then sends a `client:heartbeat`
- **THEN** the registry SHALL contain one entry for that socket id with the heartbeat's route, page key, `isPlaying`, `isIdle`, and a refreshed last-seen timestamp

#### Scenario: Registry entry removed on disconnect

- **WHEN** a previously registered client disconnects
- **THEN** the registry SHALL no longer contain an entry for that socket id

#### Scenario: Heartbeat for an unknown socket is ignored safely

- **WHEN** a `client:heartbeat` arrives whose socket id has no registry entry
- **THEN** the server SHALL ignore the heartbeat without throwing

### Requirement: Liveness state is derived from a configurable staleness window

The system SHALL classify each registered display client as `online`, `stale`, or `offline` using a pure function of the client's last-seen timestamp and the evaluation time. A client whose last-seen timestamp is within the staleness window SHALL be `online`; a connected client whose last-seen timestamp is older than the staleness window SHALL be `stale`; a client with no active connection SHALL be `offline`.

#### Scenario: Classify clients by last-seen age

- **WHEN** the liveness classifier evaluates a connected client
- **THEN** it SHALL return `online` if the last-seen age is within the staleness window and `stale` if the last-seen age exceeds it

##### Example: classification by last-seen age

| Last-seen age (s) | Connected | Staleness window (s) | Expected |
| ----------------- | --------- | -------------------- | -------- |
| 5                 | true      | 30                   | online   |
| 30                | true      | 30                   | online   |
| 45                | true      | 30                   | stale    |
| 45                | false     | 30                   | offline  |

### Requirement: Device Status exposes display client liveness to management

The `GET /api/device/status` response `data` SHALL include a `displayClients` object containing the list of registered clients with their derived liveness state and a summary count of `online`, `stale`, and `offline` clients. This data SHALL only be returned to trusted management requests, consistent with the existing Device Status access boundary.

#### Scenario: Trusted management request receives display client liveness

- **WHEN** a trusted management client requests `GET /api/device/status`
- **THEN** the response `data.displayClients` SHALL include each registered client's page key, `isPlaying`, last-seen timestamp, and derived liveness state, plus a summary count by state

#### Scenario: Untrusted request is denied before liveness data is returned

- **WHEN** an untrusted request calls `GET /api/device/status`
- **THEN** the server SHALL return the management access denied response and SHALL NOT include `displayClients` data
