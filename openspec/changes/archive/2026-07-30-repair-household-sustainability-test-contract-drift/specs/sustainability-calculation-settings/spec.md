## MODIFIED Requirements

### Requirement: Calculation coefficients are stored in a settings store with recommended defaults

The system SHALL persist six sustainability calculation settings in a dedicated settings store: carbon emission factor, tree equivalent factor, household average daily usage (kWh), household average monthly usage (kWh), estimated tariff per kWh, and a global CO2 display preference that controls whether sub-ton CO2 values are displayed as kilograms. When the settings store has no row or a setting is missing, the system SHALL fall back to the recommended Taiwan-site defaults: carbon emission factor 0.467 (kgCO2e/kWh), tree equivalent factor 0.16 (trees per ton), daily usage 13 (kWh), monthly usage 400 (kWh), tariff 4.5 (NTD per kWh), and `co2AutoConvertSmallToKg = false`.

#### Scenario: Missing settings fall back to recommended defaults

- **WHEN** the calculation settings store has no persisted row
- **THEN** reads of the settings return the recommended defaults 0.467, 0.16, 13, 400, 4.5, and `co2AutoConvertSmallToKg = false`

##### Example: Complete recommended default set

| Setting | Expected value |
| ----- | ----- |
| carbon emission factor | 0.467 |
| tree equivalent factor | 0.16 |
| household daily usage kWh | 13 |
| household monthly usage kWh | 400 |
| estimated tariff per kWh | 4.5 |
| CO2 auto-convert small values to kg | false |

#### Scenario: Persisted settings are returned

- **WHEN** a setting has been persisted with a non-default value
- **THEN** reads return the persisted value instead of the default

##### Example: CO2 display preference override

- **GIVEN** the persisted CO2 display preference is `true`
- **WHEN** the calculation settings are read
- **THEN** the returned settings include `co2AutoConvertSmallToKg = true`
