## MODIFIED Requirements

### Requirement: Factory Circuit card diagnostics are page-scoped

The system SHALL list Factory Circuit card diagnostics separately for each Factory Circuit page instance while identifying runtime data by metric scope plus semantic metric key.

#### Scenario: Operator reviews Factory Circuit card data across sites
- **WHEN** the operator opens card-centric data diagnostics
- **THEN** the system SHALL list Jungli Factory Circuit rows with `factory-circuit` identity and `metricScope = cl`
- **AND** the system SHALL list Guanyin Factory Circuit rows with `factory-circuit-guanyin` identity and `metricScope = kn`
- **AND** each Factory Circuit slot row SHALL expose the semantic metric key, effective metric scope, source topic state, and latest scoped value

##### Example: Same slot name appears as distinct scoped card rows
- **GIVEN** Jungli and Guanyin both have a `stamping` slot
- **WHEN** card diagnostics are generated
- **THEN** both rows MAY use the same semantic stamping power metric key
- **AND** one row is identified by `cl` scope while the other is identified by `kn` scope
- **AND** the two rows remain independently diagnosable and overridable

## ADDED Requirements

### Requirement: Card data overrides include effective metric scope

A display-only override exposed through card data management SHALL include the effective metric scope of its target. The system MUST NOT match an override solely by page id, card id, or semantic metric key when the same target can render site-specific data.

#### Scenario: Same Overview card is used by both factories
- **WHEN** an operator creates an override for the CL instance of a shared Overview card
- **THEN** diagnostics identify the override as CL-scoped
- **AND** the corresponding KN card continues to display its KN source value unless it has its own override

#### Scenario: Operator clears one site override
- **WHEN** CL and KN each have an override for the same shared card target and the operator clears the CL override
- **THEN** only the CL override is removed or disabled
- **AND** the KN override remains active
