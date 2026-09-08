## ADDED Requirements

### Requirement: Data Hub provides direct access to calculation settings and operational maintenance
<!-- requirement-id: U1-R9 -->

Data Hub SHALL provide an accessible operational entry point for global calculation settings (carbon emission factor, tree equivalent factor, household usage baselines, and estimated electricity tariff) and runtime trend reset maintenance. Navigating to operations SHALL NOT be blocked by circular redirects, and calculation settings SHALL be clearly marked as global shared parameters.

#### Scenario: Operator opens calculation settings and operations from Metrics
<!-- scenario-id: U1-R9-S01 -->

- **GIVEN** an authorized operator is viewing the Data Hub Metrics section
- **WHEN** the operator opens the operations maintenance view
- **THEN** the calculation settings form is displayed with currently persisted values and global scope indication
- **AND** today and month trend reset controls are available

#### Scenario: Legacy operations URL loads operational maintenance
<!-- scenario-id: U1-R9-S02 -->

- **GIVEN** an operator accesses /settings/data-hub/diagnostics/operations
- **WHEN** the route resolves
- **THEN** the operational maintenance component is rendered directly without redirecting back to sources
