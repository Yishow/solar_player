## ADDED Requirements

### Requirement: Offline, Device Status, and Brand Assets preserve protected state during background refresh

The system SHALL preserve protected state on Offline Error, Device Status, and Brand Assets while background refresh updates other lanes.

#### Scenario: Offline Error keeps the minimal fault lane during refresh

- **WHEN** Offline Error is already showing reconnect state, return routing, and minimal fault guidance while deferred diagnostics refresh
- **THEN** the page keeps that minimal fault lane visible
- **AND** it updates only the deferred diagnostics lane in the background

##### Example: reconnect lane remains authoritative

- **GIVEN** MQTT status is disconnected with reason `reconnecting`, `returnTo` resolves to `/overview`, and retry countdown is `15`
- **WHEN** display operations diagnostics refresh in the background
- **THEN** reconnect, return routing, and retry countdown still come from MQTT/local state
- **AND** `triageSummary` SHALL be the only value updated from the display operations summary

#### Scenario: Device Status keeps protected access or partial-success state during refresh

- **WHEN** Device Status already shows access-denied or partial-success status while background refresh runs
- **THEN** the page keeps that protected state visible
- **AND** it updates only the refreshable device-status lanes that can change safely

##### Example: safe-op feedback is not cleared by background sync

- **GIVEN** Device Status is showing a safe diagnostics feedback message after `refresh-readiness`
- **WHEN** a display-sync event reloads device status, log metadata, and display operations summary
- **THEN** the safe diagnostics feedback remains visible
- **AND** failed background status refresh does not clear the last usable device status

#### Scenario: Brand Assets keeps the dirty draft and pending action during refresh

- **WHEN** Brand Assets already has a dirty draft or pending destructive action while background refresh runs
- **THEN** the page keeps the current draft, selection, and pending action intact
- **AND** it updates only the background list data that does not invalidate the protected draft boundary

##### Example: pending delete confirmation defers remote overwrite

- **GIVEN** Brand Assets has selected profile `7` and is showing a pending delete confirmation
- **WHEN** a brand display-sync event arrives with refreshed profiles
- **THEN** the pending delete confirmation, selected profile, and draft fields remain intact
- **AND** the remote change is deferred until the operator keeps editing or discards and reloads
