## ADDED Requirements

### Requirement: Cumulative household equivalence follows the active factory generation scope

The Sustainability runtime SHALL derive the cumulative household-equivalent card from the same factory generation scope, total generation value, freshness state, and timestamp as its cumulative generation headline.

#### Scenario: Chungli cumulative summary is fresh

- **WHEN** Chungli is the only enabled factory playback page and its summary has matching fresh `today_mwh`, `month_mwh`, and `total_mwh` values
- **THEN** the cumulative household-equivalent card SHALL calculate households from Chungli `total_mwh` converted to kWh and divided by the configured daily household usage
- **AND** the card provenance SHALL identify the Chungli MQTT aggregate timestamp

##### Example: Chungli total produces a four-person household equivalent

- **GIVEN** Chungli `total_mwh` is `45678` and daily household usage is `13 kWh`
- **WHEN** the Sustainability runtime builds the cumulative household-equivalent card
- **THEN** its household count SHALL be `3,513,692`

#### Scenario: Chungli summary is stale

- **WHEN** Chungli is the active factory scope and its summary is stale, missing, invalid, or regressed
- **THEN** the cumulative household-equivalent card SHALL be unavailable
- **AND** it SHALL NOT fall back to an unrelated global cumulative counter
