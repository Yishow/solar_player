## ADDED Requirements

### Requirement: Expose household-equivalent derivation to card data management

The system SHALL expose Sustainability household-equivalent derivation details to card data management.

#### Scenario: Operator reviews household-equivalent card diagnostics

- **WHEN** the operator reviews a household-equivalent card in `Card Data Management`
- **THEN** diagnostics SHALL show the self-consumption basis, calculation profile fields, computed household count, source availability, and last aggregate update
- **AND** diagnostics SHALL distinguish daily summary inputs from cumulative counter inputs

##### Example: Daily household-equivalent card names its calculation basis

- **GIVEN** the daily household-equivalent card uses daily self-consumption and `householdDailyUsageKwh`
- **WHEN** diagnostics are generated for the daily household-equivalent card
- **THEN** the row names `selfConsumption` daily summary data as the source basis
- **AND** the row names `householdDailyUsageKwh` as the calculation profile field

#### Scenario: Household-equivalent aggregate input is unavailable

- **WHEN** a household-equivalent card cannot compute because the required self-consumption aggregate is unavailable
- **THEN** diagnostics SHALL classify the row as `waiting-aggregate`
- **AND** diagnostics SHALL identify the upstream MQTT metric that feeds the aggregate when that upstream mapping exists

### Requirement: Apply display overrides without changing household-equivalent formulas

The system SHALL apply display overrides to Sustainability household-equivalent card display values without changing household-equivalent formulas or source aggregates.

#### Scenario: Operator overrides a household-equivalent card

- **WHEN** the operator applies a display override to a household-equivalent card
- **THEN** playback SHALL display the override value for that card target
- **AND** diagnostics SHALL keep the computed household value, self-consumption basis, and calculation profile visible as source provenance
- **AND** the system SHALL NOT change the household-equivalent calculation profile or self-consumption aggregate because of the override

##### Example: Daily household override preserves computed value

- **GIVEN** the computed daily household count is `4`
- **WHEN** the operator applies display override value `8`
- **THEN** playback displays `8` for the daily household card
- **AND** diagnostics keep computed household count `4` as source provenance

#### Scenario: Operator clears a household-equivalent override

- **WHEN** the operator clears the household-equivalent override
- **THEN** playback SHALL return to the formula-derived household count
- **AND** diagnostics SHALL no longer mark the card target as overridden

##### Example: Cleared household override returns to formula result

- **GIVEN** the computed cumulative household count is `18`
- **AND** an active override displays `25`
- **WHEN** the operator clears the override
- **THEN** playback displays `18` for the cumulative household card
