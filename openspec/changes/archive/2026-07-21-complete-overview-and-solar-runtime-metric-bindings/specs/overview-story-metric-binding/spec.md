## MODIFIED Requirements

### Requirement: Provide declarative story metric binding for Overview

The system SHALL let the `Overview` display page bind every rendered KPI and summary state to a declared backend metric contract, including provenance and fallback behavior.

#### Scenario: Overview readiness matches rendered KPI coverage

- **WHEN** the `Overview` page renders its five KPI cards
- **THEN** each displayed value has a declared source metric or derived rule
- **AND** readiness can report missing coverage for any of those rendered values

##### Example: CO2 cards are covered by the contract

- **GIVEN** `Overview` renders `todayCo2Reduction` and `totalCo2Reduction`
- **WHEN** one of those upstream values is missing or stale
- **THEN** the story payload and readiness report both identify that dependency
- **AND** the page shows a predictable degraded state instead of silently masking the gap
