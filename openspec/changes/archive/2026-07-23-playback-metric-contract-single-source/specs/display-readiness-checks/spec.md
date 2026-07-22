## ADDED Requirements

### Requirement: Readiness gate metric requirements remain the single gate-facing contract for Overview and Solar

Display readiness evaluation for Overview and Solar SHALL continue to use the shared display metric requirements list as the gate-facing contract. Overview and Solar consumers outside readiness SHALL NOT maintain a second authoritative list of gate metric keys. This change SHALL NOT introduce new rotation skip reasons and SHALL NOT change the meaning of existing readiness statuses for missing MQTT mappings or missing derived coverage.

#### Scenario: Overview readiness still evaluates shared requirements only

- **WHEN** readiness evaluates the `overview` page
- **THEN** it uses the shared display metric requirements entries whose pageId is `overview`
- **AND** it does not read a page-local Overview gate key list as a second source of truth

#### Scenario: Solar readiness still evaluates shared requirements only

- **WHEN** readiness evaluates the `solar` page
- **THEN** it uses the shared display metric requirements entries whose pageId is `solar`
- **AND** existing blocking outcomes for missing required mappings such as `systemEfficiency` remain expressible

#### Scenario: No new skip reasons from contract consolidation

- **WHEN** rotation consumes readiness findings after Overview and Solar contract consolidation
- **THEN** skip reasons remain within the existing readiness-to-rotation mapping
- **AND** no new skip reason string is required for sourceClass alignment alone
