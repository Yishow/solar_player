## ADDED Requirements

### Requirement: Expose monitoring card diagnostics for management surfaces

The system SHALL expose monitoring card diagnostics from shared monitoring story data for management surfaces.

#### Scenario: Management surface requests monitoring card diagnostics

- **WHEN** a management surface requests diagnostics for Overview, Solar, or Factory Circuit value cards
- **THEN** the shared monitoring story data SHALL expose card target identity, metric identity, current source value, display value, unit, source topics, dependency metrics, fallback reason, freshness state, and last update
- **AND** the diagnostic payload SHALL use stable identifiers rather than page-local display text as the only target identity

##### Example: Overview power card exposes stable diagnostics

- **GIVEN** the Overview real-time power card uses metric `realTimePower`
- **WHEN** diagnostics are generated for Overview
- **THEN** the diagnostic row includes page id `overview`, metric key `realTimePower`, source topic `kuozui/plant/solar/power`, display value, source value, and freshness state

#### Scenario: Card derives from multiple monitoring inputs

- **WHEN** a card display value derives from more than one monitoring metric
- **THEN** the diagnostic payload SHALL list each required input with its metric key, topic mapping state, source topic when mapped, and latest value state
- **AND** the payload SHALL identify which input blocks the computed display value when the card is unavailable

##### Example: Self-consumption ratio reports missing consumption input

- **GIVEN** `selfConsumptionEnergy` is live
- **AND** `consumptionEnergy` has no latest value
- **WHEN** diagnostics are generated for the self-consumption ratio card
- **THEN** the diagnostic row lists both inputs
- **AND** the row identifies `consumptionEnergy` as the blocking input

### Requirement: Apply display overrides after monitoring source resolution

The system SHALL apply display overrides after monitoring source values and fallback states are resolved.

#### Scenario: Override exists for a monitoring card

- **WHEN** a display override is active for a monitoring card target
- **THEN** the playback story payload SHALL expose the override value as the display value
- **AND** management diagnostics SHALL expose both the original source value and the applied override value
- **AND** freshness and source topic metadata SHALL continue to describe the original monitoring source

##### Example: Monitoring override keeps source metadata

- **GIVEN** `realTimePower` source value is `42 kW`
- **AND** an active override displays `60 kW`
- **WHEN** diagnostics are generated for the Overview power card
- **THEN** the row reports source value `42 kW`, display value `60 kW`, and the original source topic

#### Scenario: Override is inactive or expired

- **WHEN** a display override for a monitoring card target is inactive or expired
- **THEN** the playback story payload SHALL use the real source or fallback-resolved value
- **AND** management diagnostics SHALL mark the override as inactive rather than applying it

##### Example: Expired monitoring override is not applied

- **GIVEN** `realTimePower` source value is `42 kW`
- **AND** an override value `60 kW` expired at `2026-07-08T09:00:00.000Z`
- **WHEN** diagnostics are generated after that expiry
- **THEN** playback receives `42 kW`
- **AND** diagnostics mark the override as inactive
