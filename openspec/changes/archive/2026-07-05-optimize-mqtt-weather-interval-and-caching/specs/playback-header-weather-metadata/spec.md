## MODIFIED Requirements

### Requirement: Preserve the weather slot with explicit fallback states

The system SHALL preserve the header weather slot across loading, disabled, unavailable, and stale states instead of removing the slot.

#### Scenario: Stale weather data is still rendered as stale

- **WHEN** the header receives a stale weather snapshot from the internal weather contract
- **THEN** it SHALL be allowed to render the last successful observation
- **AND** it SHALL expose that the value is stale by displaying a stale indicator such as "資料延遲" or details of the last update time if the duration since the last observation exceeds 2x the configured update interval

##### Example: stale metadata keeps the last successful observation visible

- **GIVEN** the last successful weather snapshot produced `台北 多雲 31°C`
- **AND** a later refresh marks the snapshot as `fetchState=stale`
- **WHEN** the header metadata is composed
- **THEN** the primary line SHALL remain equivalent to `台北 多雲 31°C`
- **AND** the secondary line SHALL expose a stale indicator such as `資料延遲`

## ADDED Requirements

### Requirement: Support polling for weather updates

The playback pages SHALL poll the server for weather updates at the configured interval.

#### Scenario: Active page polls for updates

- **WHEN** the playback page is active and the update interval is configured (e.g. 10 minutes, 30 minutes, etc.)
- **THEN** the client-side hook SHALL poll `/api/weather/current` at that frequency
- **AND** it SHALL update the weather state immediately upon receiving a new snapshot

#### Scenario: Manual refresh mode disables polling

- **WHEN** the update interval is set to manual
- **THEN** the client-side hook SHALL NOT poll the server after the initial load
