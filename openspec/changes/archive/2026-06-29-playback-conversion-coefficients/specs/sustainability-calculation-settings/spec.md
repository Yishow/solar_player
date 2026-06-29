## ADDED Requirements

### Requirement: Calculation coefficients are stored in a settings store with recommended defaults

The system SHALL persist five sustainability calculation coefficients in a dedicated settings store: carbon emission factor, tree equivalent factor, household average daily usage (kWh), household average monthly usage (kWh), and estimated tariff per kWh. When the settings store has no row or a coefficient is missing, the system SHALL fall back to the recommended defaults: carbon emission factor 0.495 (kgCO₂e/kWh), tree equivalent factor 2.6 (trees per ton), daily usage 4 (kWh), monthly usage 120 (kWh), and tariff 5 (per kWh).

#### Scenario: Missing settings fall back to recommended defaults

- **WHEN** the calculation settings store has no persisted row
- **THEN** reads of the coefficients return the recommended defaults 0.495, 2.6, 4, 120, and 5

#### Scenario: Persisted coefficients are returned

- **WHEN** a coefficient has been persisted with a non-default value
- **THEN** reads return the persisted value instead of the default

##### Example: carbon factor override

- **GIVEN** the persisted carbon emission factor is 0.494
- **WHEN** the carbon emission factor is read
- **THEN** the returned value is 0.494

### Requirement: Operators can view and update calculation coefficients

The system SHALL expose an API and a management settings surface that let operators view and update the five calculation coefficients. Updates SHALL persist and survive reload. The system SHALL reject a non-numeric or non-positive coefficient value and SHALL NOT persist it.

#### Scenario: Operator updates a coefficient and it persists

- **WHEN** an operator updates the carbon emission factor through the settings surface and saves
- **THEN** the new value is persisted
- **AND** reloading the settings surface shows the updated value

#### Scenario: Invalid coefficient is rejected

- **WHEN** a coefficient is submitted as a non-positive or non-numeric value
- **THEN** the system rejects the update and does not persist it

### Requirement: Carbon reduction is derived uniformly from generation and the carbon emission factor across playback pages

The system SHALL compute carbon reduction from generation and the configured carbon emission factor, uniformly for the Overview, Solar, and Sustainability pages. Today's carbon reduction (tons) SHALL be today's generation (kWh) multiplied by the carbon emission factor divided by 1000, and cumulative carbon reduction (tons) SHALL be cumulative generation (kWh) multiplied by the carbon emission factor divided by 1000. The system SHALL NOT use the MQTT `todayCo2Reduction`, `totalCo2Reduction`, or `co2` counters as the source for the displayed carbon reduction cards. When the underlying generation value is unavailable or non-finite, the carbon reduction card SHALL keep its existing unavailable/`--` fallback rather than emitting a fabricated value.

#### Scenario: Carbon reduction matches across the three pages for the same factor

- **WHEN** the carbon emission factor is configured to a value
- **THEN** the Overview, Solar, and Sustainability today/cumulative carbon reduction cards each derive from the same factor and the corresponding generation
- **AND** the same generation and factor yield the same carbon reduction value on all three pages

##### Example: today carbon reduction from generation

- **GIVEN** today's generation is 2000 kWh and the carbon emission factor is 0.495
- **WHEN** today's carbon reduction is computed
- **THEN** the value is 0.99 tons

#### Scenario: Missing generation keeps the fallback

- **WHEN** the generation value for a carbon reduction card is unavailable or non-finite
- **THEN** the card keeps its existing unavailable/`--` fallback
- **AND** no fabricated carbon reduction value is shown

### Requirement: Tree equivalent and household equivalence derive from the configured coefficients

The system SHALL compute the Sustainability tree equivalent as the derived carbon reduction (tons) multiplied by the configured tree equivalent factor. The system SHALL compute household-equivalent counts from measured self-consumption divided by the configured usage basis, using the configured daily usage for the daily card and the configured monthly usage for the cumulative card.

#### Scenario: Tree equivalent uses the configured factor and derived carbon reduction

- **WHEN** the derived carbon reduction and the configured tree equivalent factor are available
- **THEN** the tree equivalent is the derived carbon reduction multiplied by the configured tree equivalent factor

##### Example: tree equivalent from derived carbon reduction

- **GIVEN** the derived cumulative carbon reduction is 100 tons and the tree equivalent factor is 2.6
- **WHEN** the tree equivalent is computed
- **THEN** the value is 260

#### Scenario: Household card uses the configured usage basis

- **WHEN** the daily household-equivalent card resolves from measured daily self-consumption
- **THEN** the household count derives from that self-consumption divided by the configured daily usage
- **AND** the cumulative card uses the configured monthly usage as its basis
