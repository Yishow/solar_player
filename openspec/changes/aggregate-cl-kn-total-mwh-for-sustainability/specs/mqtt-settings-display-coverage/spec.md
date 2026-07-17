## ADDED Requirements

### Requirement: Evaluate derived generation coverage from CL and KN dependencies

MQTT Settings SHALL evaluate canonical generation coverage as a derived dependency group backed by the CL and KN factory summary mappings rather than requiring a direct topic mapping for each canonical metric.

#### Scenario: Both factory mappings have current values

- **WHEN** CL and KN summary mappings are enabled and each has current finite daily, monthly, and cumulative values
- **THEN** canonical generation coverage SHALL be ready
- **AND** the operator SHALL be able to inspect both source mappings from the same MQTT workspace

##### Example: CL and KN mappings are healthy

- **GIVEN** enabled CL and KN summary mappings each expose finite `today_mwh`, `month_mwh`, and `total_mwh` within the timeout
- **WHEN** MQTT Settings evaluates generation coverage
- **THEN** it reports ready and lists both CL and KN source mappings

#### Scenario: One factory dependency is incomplete

- **WHEN** either factory summary mapping is missing, disabled, stale, invalid, or reports a cumulative regression
- **THEN** MQTT Settings SHALL show canonical generation as degraded or blocked
- **AND** the finding SHALL identify the affected factory and source field
- **AND** it SHALL NOT report the absence of a direct canonical topic as the root cause

##### Example: KN cumulative field is absent

- **GIVEN** CL is complete and KN summary has no `total_mwh`
- **WHEN** MQTT Settings evaluates cumulative generation coverage
- **THEN** it reports blocked with KN `total_mwh` as the dependency failure and does not request a direct `totalGeneration` topic

### Requirement: Evaluate Sustainability coverage for the playback factory scope

MQTT Settings and display readiness SHALL evaluate Sustainability generation coverage against only the factory dependencies enabled by playback settings, while retaining the two-factory dependency rule for canonical combined generation.

#### Scenario: CL-only Sustainability scope is healthy while KN is stale

- **WHEN** only `factory-circuit` is enabled, CL summary fields are current, and KN is stale
- **THEN** Sustainability coverage SHALL be ready for the CL scope
- **AND** canonical combined generation coverage SHALL remain degraded because KN is stale

#### Scenario: Both factories are enabled

- **WHEN** both factory pages are enabled
- **THEN** Sustainability coverage SHALL require current CL and KN source fields

##### Example: KN is stale in the combined scope

- **GIVEN** both factory pages are enabled, CL is current, and KN exceeds the MQTT timeout
- **WHEN** Sustainability coverage is evaluated
- **THEN** it reports the CL plus KN scope as degraded and identifies KN as stale

#### Scenario: Both factories are disabled

- **WHEN** both factory pages are disabled
- **THEN** Sustainability coverage SHALL report no factory selected rather than an MQTT mapping failure

##### Example: Healthy mappings with no enabled factory

- **GIVEN** CL and KN mappings are both healthy but both factory pages are disabled
- **WHEN** Sustainability coverage is evaluated
- **THEN** it reports no factory selected and does not report either mapping as failed
