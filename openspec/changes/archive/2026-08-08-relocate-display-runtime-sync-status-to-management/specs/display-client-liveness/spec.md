## MODIFIED Requirements

### Requirement: Display clients emit periodic liveness heartbeats

The playback shell SHALL emit a `client:heartbeat` event over the existing Socket.IO connection at a fixed interval while the playback shell is mounted. Each heartbeat SHALL carry the client session class, the current route path, the current playback page key (or null when none is active), the `isPlaying` flag, the `isIdle` flag, the viewport width and height, and the client-side ISO timestamp.

Each heartbeat SHALL additionally carry the display runtime sync state, the page key of the runtime source that reported it, the ISO timestamp of the last successful runtime sync, and the last runtime sync error message. The runtime sync state SHALL be one of `unknown`, `loading`, `synced`, or `degraded`. The error message SHALL be null whenever the state is `synced`. When no display runtime source has reported yet, the heartbeat SHALL carry state `unknown` with a null page key, null timestamp, and null error message.

#### Scenario: Heartbeat emitted on a fixed interval

- **WHEN** the playback shell has been mounted for longer than one heartbeat interval and the socket is connected
- **THEN** the client SHALL emit a `client:heartbeat` event carrying route path, current page key, `isPlaying`, `isIdle`, viewport size, and a client timestamp
- **AND** the event SHALL carry the display runtime sync state, reporting page key, last successful sync timestamp, and last error message

#### Scenario: Heartbeat emitted immediately on playback page change

- **WHEN** the active playback page key changes
- **THEN** the client SHALL emit a `client:heartbeat` event reflecting the new page key without waiting for the next interval tick

#### Scenario: No heartbeat while socket is disconnected

- **WHEN** the Socket.IO connection is not in the connected state
- **THEN** the client SHALL NOT emit `client:heartbeat` events until the connection is re-established
- **AND** the first heartbeat after reconnection SHALL carry the display runtime sync values current at that moment

#### Scenario: Invalid runtime sync state is treated as not reported

- **WHEN** the server receives a heartbeat whose runtime sync state is absent or not one of the four defined values
- **THEN** the server SHALL record the runtime sync state as `unknown` with a null page key, null timestamp, and null error message
- **AND** the server SHALL still accept and process the remaining heartbeat fields

---

### Requirement: Device Status exposes display client liveness to management

The `GET /api/device/status` response `data` SHALL include a `displayClients` object containing the list of registered clients with their derived liveness state and a summary count of `online`, `stale`, and `offline` clients. This data SHALL only be returned to trusted management requests, consistent with the existing Device Status access boundary.

Each client entry SHALL include the display runtime sync state, the reporting runtime source page key, the last successful runtime sync timestamp, and the last runtime sync error message. The `Device Status` management surface SHALL render the runtime sync state and the last successful sync timestamp for each client alongside the existing per-client fields, and SHALL render an explicit not-reported indication rather than a blank value when the state is `unknown`.

Because heartbeats are emitted only by clients that pass socket identity authentication, this list SHALL NOT be read as covering every display machine. The `Device Status` management surface SHALL state that the display client list covers only paired, connected clients, so that an absent machine is not mistaken for a healthy one.

#### Scenario: Trusted management request receives display client liveness

- **WHEN** a trusted management client requests `GET /api/device/status`
- **THEN** the response `data.displayClients` SHALL include each registered client's page key, `isPlaying`, last-seen timestamp, and derived liveness state, plus a summary count by state
- **AND** each client entry SHALL include the display runtime sync state, reporting page key, last successful sync timestamp, and last error message

#### Scenario: Untrusted request is denied before liveness data is returned

- **WHEN** an untrusted request calls `GET /api/device/status`
- **THEN** the server SHALL return the management access denied response and SHALL NOT include `displayClients` data

#### Scenario: Device Status renders runtime sync state per client

- **WHEN** a trusted operator views the `Device Status` page and display clients are registered
- **THEN** each client row SHALL show the display runtime sync state and the last successful runtime sync timestamp
- **AND** a client that has never reported runtime sync SHALL show an explicit not-reported indication instead of a blank value

##### Example: Rendered runtime sync state per client

| Runtime sync state | Last successful sync timestamp | Rendered state | Rendered timestamp |
| ------------------ | ------------------------------ | -------------- | ------------------ |
| `unknown` | null | not reported | not reported |
| `loading` | null | syncing | not reported |
| `synced` | an ISO timestamp | synced | that timestamp, formatted |
| `degraded` | an earlier ISO timestamp | sync failed | that earlier timestamp, formatted |
| `degraded` | null | sync failed | not reported |

#### Scenario: Display client list states its coverage boundary

- **WHEN** a trusted operator views the `Device Status` display client section
- **THEN** the surface SHALL state that the list covers only paired, connected clients
- **AND** an unpaired display machine SHALL NOT appear in the list

##### Example: Unpaired machine is absent, not healthy

- **GIVEN** one paired client is reporting normally and one display machine has no Device Credential
- **WHEN** the operator reads the display client section
- **THEN** only the paired client appears
- **AND** the stated coverage boundary tells the operator that absence does not imply health
