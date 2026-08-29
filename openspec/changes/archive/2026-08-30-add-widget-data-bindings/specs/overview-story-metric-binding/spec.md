## ADDED Requirements

### Requirement: Overview story bindings resolve from stable widget configuration

For Overview value-bearing widgets that support explicit data bindings, the story runtime SHALL resolve the metric contract from the widget's stable saved binding rather than from its array position. The binding SHALL continue to use shared metric dependency, source classification, provenance, freshness, and fallback contracts.

#### Scenario: Overview KPI order changes
- **WHEN** an operator reorders Overview KPI widgets without changing their stable bindings
- **THEN** the story payload keeps each KPI associated with its previously bound semantic metric
- **AND** readiness/freshness remain attached to that metric rather than to the widget's new index

#### Scenario: Overview KPI binding changes to another registered metric
- **WHEN** an operator publishes a compatible new metric binding for an Overview KPI
- **THEN** the story resolves value, dependencies, freshness, provenance, and fallback for the new binding
- **AND** the previous metric is no longer treated as required solely because it occupied that KPI position before the edit
