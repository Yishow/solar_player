## MODIFIED Requirements

### Requirement: Calculation coefficients are stored in a settings store with recommended defaults

The system SHALL persist six sustainability calculation settings in a dedicated settings store: carbon emission factor, tree equivalent factor, household average daily usage (kWh), household average monthly usage (kWh), estimated tariff per kWh, and a global CO2 display preference that controls whether sub-ton CO2 values are displayed as kilograms. When the settings store has no row or a setting is missing, the system SHALL fall back to the recommended defaults: carbon emission factor 0.495 (kgCO2e/kWh), tree equivalent factor 2.6 (trees per ton), daily usage 4 (kWh), monthly usage 120 (kWh), tariff 5 (per kWh), and `co2AutoConvertSmallToKg = false`.

#### Scenario: Missing settings fall back to recommended defaults

- **WHEN** the calculation settings store has no persisted row
- **THEN** reads of the settings return the recommended defaults 0.495, 2.6, 4, 120, 5, and `co2AutoConvertSmallToKg = false`

#### Scenario: Persisted settings are returned

- **WHEN** a setting has been persisted with a non-default value
- **THEN** reads return the persisted value instead of the default

##### Example: CO2 display preference override

- **GIVEN** the persisted CO2 display preference is `true`
- **WHEN** the calculation settings are read
- **THEN** the returned settings include `co2AutoConvertSmallToKg = true`

### Requirement: Operators can view and update calculation coefficients

The system SHALL expose an API and a management settings surface that let operators view and update the six calculation settings. Updates SHALL persist and survive reload. The system SHALL reject a non-numeric or non-positive numeric coefficient value, SHALL reject a non-boolean CO2 display preference value, and SHALL NOT persist an invalid submission.

#### Scenario: Operator updates a setting and it persists

- **WHEN** an operator updates the CO2 display preference through the settings surface and saves
- **THEN** the new value is persisted
- **AND** reloading the settings surface shows the updated value

#### Scenario: Invalid setting is rejected

- **WHEN** a setting submission includes a non-positive or non-numeric coefficient value, or a non-boolean CO2 display preference value
- **THEN** the system rejects the update and does not persist it
