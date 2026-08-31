## ADDED Requirements

### Requirement: Card-centric diagnostics are reachable through Data Hub metric usage workflows

The existing card-centric diagnostics capability SHALL be integrated into Data Hub Metrics, Usage, or Diagnostics so an operator can move from a semantic metric to its consuming cards/widgets and from a card/widget back to its metric/provenance. Existing current value, display value/override, source classification/topics, formula/dependencies, and last-update information SHALL remain available where applicable.

#### Scenario: Operator inspects a metric used by multiple cards
- **WHEN** a semantic metric is consumed by multiple published display items
- **THEN** Data Hub Usage identifies those consumers
- **AND** selecting a consumer can expose the existing card-centric diagnostic details without requiring a separate flat MQTT-only card list

### Requirement: Card diagnostics keep scope explicit inside all-scope management views

When Data Hub displays card diagnostics across more than one metric scope, each value/override/provenance row SHALL identify its effective scope and SHALL NOT collapse CL/KN rows solely because page id, item id, or semantic metric key matches.

#### Scenario: Shared Overview card exists for both sites
- **WHEN** an operator uses an all-scope diagnostic view for an inherited Overview KPI
- **THEN** CL and KN resolved values remain separately identified
- **AND** any site-specific display override is shown only on its matching scoped row
