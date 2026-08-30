## ADDED Requirements

### Requirement: Canonical CL+KN generation is registry-defined global derivation

The canonical CL+KN daily, monthly, and cumulative generation calculations SHALL be represented by global Derived Metric Registry definitions whose inputs explicitly select the CL and KN factory-generation source metrics. The registry-backed definitions SHALL preserve the existing requirement that both site inputs are finite and current before a new canonical result is accepted.

#### Scenario: Both factory source metrics are current
- **WHEN** the registry evaluates the global canonical generation definition with valid current CL and KN MWh inputs
- **THEN** the result equals the existing CL+KN sum
- **AND** its effective timestamp uses the older contributing source timestamp
- **AND** provenance names both scoped site inputs

#### Scenario: One factory source becomes stale
- **WHEN** KN is stale while CL remains current
- **THEN** the definition does not publish a partial CL-only global generation value
- **AND** the existing last-complete global result is retained through `retain-last-good`
- **AND** diagnostics identify the KN dependency as stale

### Requirement: Existing cumulative regression protection survives registry migration

Moving canonical generation into the Derived Metric Registry SHALL NOT remove the existing protection against silent cumulative generation regressions. A newly evaluated cumulative result that violates the existing accepted regression/reset rules MUST NOT replace the last accepted canonical cumulative value.

#### Scenario: Valid inputs produce a regressed cumulative total
- **WHEN** current CL and KN cumulative source inputs sum to a value rejected by the existing cumulative regression policy
- **THEN** the global derived cumulative metric does not accept the regressed result
- **AND** diagnostics expose the regression reason separately from expression syntax/availability failures
