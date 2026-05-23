## ADDED Requirements

### Requirement: Compose header weather metadata into primary and secondary lines

The system SHALL compose configured weather metadata into a primary line and an optional secondary line before rendering the playback header.

#### Scenario: Standard preset produces a readable two-line summary

- **WHEN** the current weather snapshot contains a location, a weather condition, a temperature, and additional configured fields
- **THEN** the header metadata SHALL place the location, condition, and temperature in the primary line
- **AND** the remaining configured fields SHALL appear in the secondary line when space permits

##### Example: standard preset composition

- **GIVEN** `stationName=台北`, `weather=多雲`, `airTemperature=31`, `relativeHumidity=72`, and `observationTime=2026-05-23T14:20:00+08:00`
- **WHEN** the header metadata is composed for the standard preset
- **THEN** the primary line SHALL be equivalent to `台北 多雲 31°C`
- **AND** the secondary line SHALL include humidity and the observation time summary

### Requirement: Preserve the weather slot with explicit fallback states

The system SHALL preserve the header weather slot across loading, disabled, unavailable, and stale states instead of removing the slot.

#### Scenario: Weather is unavailable or disabled

- **WHEN** the header cannot render a ready weather summary because weather is disabled, still loading, or temporarily unavailable
- **THEN** the header SHALL render a neutral weather slot state
- **AND** it SHALL NOT collapse the slot entirely

##### Example: disabled weather keeps a neutral slot

- **GIVEN** weather settings are saved with `enabled=false`
- **WHEN** the header bootstraps weather metadata from the internal weather contract
- **THEN** the weather slot SHALL stay rendered with a neutral disabled state
- **AND** it SHALL NOT substitute fabricated copy such as `晴 26°C`

#### Scenario: Stale weather data is still rendered as stale

- **WHEN** the header receives a stale weather snapshot from the internal weather contract
- **THEN** it SHALL be allowed to render the last successful observation
- **AND** it SHALL expose that the value is stale through its metadata or copy

##### Example: stale metadata keeps the last successful observation visible

- **GIVEN** the last successful weather snapshot produced `台北 多雲 31°C`
- **AND** a later refresh marks the snapshot as `fetchState=stale`
- **WHEN** the header metadata is composed
- **THEN** the primary line SHALL remain equivalent to `台北 多雲 31°C`
- **AND** the secondary line SHALL expose a stale indicator such as `資料延遲`
