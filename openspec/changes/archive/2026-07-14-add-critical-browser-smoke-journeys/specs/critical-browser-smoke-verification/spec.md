## ADDED Requirements

### Requirement: Browser smoke runtime is isolated from production state

The browser smoke runner SHALL create a unique temp database, temp image and brand upload directories, deterministic mock data mode, fixed test port, and bounded server process for each run.

#### Scenario: Browser smoke starts

- **WHEN** the operator runs the browser smoke command
- **THEN** no production database, .env file, or upload directory is read or written
- **AND** all child processes and temp runtime paths are cleaned after success or failure

### Requirement: Draft conflict and publish refresh journey is verified

The browser smoke suite SHALL verify an editor draft save, a stale-version conflict, a successful publish, and playback refresh through the real REST, SQLite, Socket.IO, and router path.

#### Scenario: Stale editor session publishes after conflict resolution

- **WHEN** one browser session saves a newer draft and another session attempts a stale save
- **THEN** the stale save receives the explicit conflict state
- **AND** after reloading the latest draft and publishing, the playback browser renders the published value without a full application restart

### Requirement: Image governance and fallback journey is verified

The browser smoke suite SHALL verify image upload, playlist inclusion, Images playback, and configured missing-asset fallback through the real application boundary.

#### Scenario: Published image becomes unavailable

- **WHEN** a valid uploaded image is included in the playlist and then made unavailable in the isolated fixture
- **THEN** Images playback does not render a broken or blank stage
- **AND** it applies the configured fallback behavior

### Requirement: Data-mode readiness and live refresh journey is verified

The browser smoke suite SHALL verify a data-mode change, readiness and rotation-plan recalculation, skip-reason behavior, and live metric refresh.

#### Scenario: Mock mode becomes ready

- **WHEN** the isolated runtime switches to deterministic mock mode
- **THEN** readiness and rotation APIs report the expected playable pages
- **AND** a subsequent live metric event updates the visible playback value

### Requirement: Playback survives reload and socket reconnect

The browser smoke suite SHALL verify application reload and Socket.IO reconnect without a persistent blank playback stage.

#### Scenario: Playback browser reconnects

- **WHEN** the playback browser reloads and the Socket.IO connection is interrupted once
- **THEN** the playback shell remains visible during recovery
- **AND** the playback route resumes live updates after reconnect without an application restart

### Requirement: Failed journeys retain bounded evidence

Each failed browser journey SHALL retain a screenshot, browser console log, network summary, and server log under a run-specific artifact directory.

#### Scenario: Journey assertion fails

- **WHEN** a browser smoke assertion fails
- **THEN** the command exits nonzero
- **AND** its output prints the artifact directory containing all four evidence types
