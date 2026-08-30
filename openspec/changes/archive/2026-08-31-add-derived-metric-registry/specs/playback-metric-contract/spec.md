## ADDED Requirements

### Requirement: Derived metric dependencies and source classification come from the registry

For a metric registered as derived, the shared playback metric contract SHALL obtain its derived source classification, dependency graph, output unit/precision metadata, and runtime dependency keys from the active Derived Metric Registry definition instead of duplicating those details in page-local or static parallel lists.

#### Scenario: Registered derived metric is selected by a widget
- **WHEN** an effective widget binding selects a registered derived metric
- **THEN** the playback contract identifies it as `derived-metric`
- **AND** readiness/live subscription dependency resolution uses the active registry dependencies
- **AND** the page does not need a second hardcoded dependency array for that metric

#### Scenario: Derived definition dependencies change after valid management update
- **WHEN** an authorized registry edit changes the dependencies of a derived metric and the new definition is activated
- **THEN** subsequent effective playback contracts use the new dependency set
- **AND** stale page-local dependency metadata cannot remain authoritative
