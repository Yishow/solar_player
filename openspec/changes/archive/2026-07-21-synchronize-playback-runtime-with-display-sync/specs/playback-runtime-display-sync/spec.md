## ADDED Requirements

### Requirement: Reload playback runtime after relevant display sync

The system SHALL reload client playback runtime when a `display:sync` event can change effective rotation state.

#### Scenario: Relevant scope triggers runtime refresh

- **WHEN** the client receives a `display:sync` event with a scope that affects playable pages, readiness, or fallback routing
- **THEN** the client SHALL reload authoritative playback runtime inputs
- **AND** the effective playback sequence SHALL match the latest server rotation preview

##### Example: Asset health change removes a page from rotation

- **GIVEN** `Images` is currently playable in the client runtime
- **WHEN** a `display:sync` event reports an image-related change and the next server rotation preview marks `Images` as skipped
- **THEN** the client removes `Images` from the effective sequence
- **AND** route rotation follows the updated playable list

### Requirement: Reconcile current route after runtime refresh

The system SHALL reconcile the current route against the refreshed playback runtime.

#### Scenario: Current route remains playable

- **WHEN** the client refreshes playback runtime and the current route is still present in the refreshed playable sequence
- **THEN** the client SHALL keep the current route active
- **AND** the runtime SHALL preserve compatible playback continuity instead of forcing a restart from the first page

##### Example: Overview remains active after an unrelated MQTT sync

- **GIVEN** the client is currently showing `Overview`
- **AND** the refreshed rotation preview still includes `Overview` as playable
- **WHEN** a relevant `display:sync` event triggers runtime refresh
- **THEN** the client stays on `Overview`
- **AND** playback does not restart from page index zero

#### Scenario: Current route becomes unplayable

- **WHEN** the client refreshes playback runtime and the current route is no longer playable
- **THEN** the client SHALL navigate to the next playable route or the refreshed fallback route
- **AND** the client MUST NOT keep rotating on the stale route

##### Example: Solar falls back after readiness failure

- **GIVEN** the client is currently showing `Solar`
- **AND** the refreshed rotation preview now skips `Solar` because live data is not ready
- **WHEN** runtime refresh completes
- **THEN** the client navigates to the next playable route or `/offline` if no playable route remains
- **AND** `Solar` is no longer treated as the current playback route

### Requirement: Coalesce repeated display sync reloads

The system SHALL coalesce repeated relevant `display:sync` events that arrive within one reload window.

#### Scenario: Burst of sync events produces one refresh cycle

- **WHEN** multiple relevant `display:sync` events arrive before the previous playback reload finishes
- **THEN** the client SHALL complete at most one additional reload cycle for that burst
- **AND** it MUST NOT spawn unbounded overlapping runtime refreshes
