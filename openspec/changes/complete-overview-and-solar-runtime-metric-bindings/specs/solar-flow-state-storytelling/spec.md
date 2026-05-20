## MODIFIED Requirements

### Requirement: Provide flow state storytelling for Solar

The system SHALL let the `Solar` display page express operational flow state and KPI storytelling from a complete declared runtime contract, not only from a partially covered metric subset.

#### Scenario: Solar KPI contract includes derived and cumulative indicators

- **WHEN** `Solar` renders self-consumption ratio, CO2 reduction, generation, and efficiency cards
- **THEN** each card resolves from a declared backend metric source or declared derived rule
- **AND** the runtime contract exposes whether the value is live, cumulative, derived, or fallback

##### Example: Self-consumption ratio cannot hide missing inputs

- **GIVEN** the `Solar` page shows `selfConsumptionRatio`
- **WHEN** the inputs required to compute or provide that value are missing
- **THEN** readiness and story diagnostics both report the gap
- **AND** the page does not pretend the ratio is a fully healthy live metric
