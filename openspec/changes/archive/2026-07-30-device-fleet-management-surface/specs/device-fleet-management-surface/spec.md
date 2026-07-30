## ADDED Requirements

### Requirement: Manage Devices and Groups from one trusted surface

The management UI SHALL provide Device create, edit, enable, disable, and Group assignment actions, plus Group create, edit, enable, disable, Site Scope, and Default Profile assignment actions.

#### Scenario: Configure a new CL lobby Device

- **WHEN** a trusted manager creates Group CL Lobby with Site Scope cl and Default Profile, then creates Device cl-lobby-01 in that Group
- **THEN** the Device row displays the resolved Group, cl Site Scope, enabled state, and unpaired state

### Requirement: Complete pairing actions without exposing credentials

The management UI SHALL display a Pairing URL and expiry only immediately after token creation. It SHALL clear the plaintext token when the pairing dialog closes and SHALL never display a Device Credential. Re-pair SHALL require confirmation that the prior credential is revoked after exchange.

#### Scenario: Close a newly created Pairing dialog

- **WHEN** the manager closes the dialog containing a Pairing URL
- **THEN** reopening the Device row does not reveal the prior token
- **AND** the manager must issue a new token to obtain another URL

### Requirement: Present fleet status with explicit operational states

Each Device row SHALL display clientId, displayName, Group, Site Scope, pairing state, enabled state, last seen, route, page, playback state, connection count, and duplicate identity warning. Loading, empty, unpaired, disabled, offline, unavailable, and mutation failure SHALL remain distinguishable.

#### Scenario: Device is disabled while its last heartbeat remains visible

- **WHEN** a Device is disabled after a successful heartbeat
- **THEN** the row displays disabled as the formal playback state
- **AND** retains last seen, route, and page as historical diagnostics

### Requirement: Keep management code out of playback sessions

The Device Fleet route SHALL load through the existing lazy ManagementShell boundary. A playback-only session SHALL NOT preload the fleet chunk or submit Device management requests.

#### Scenario: Playback route loads

- **WHEN** a Client opens a playback page without management trust
- **THEN** the Device Fleet module is not loaded
- **AND** no Device or Group management request is sent
