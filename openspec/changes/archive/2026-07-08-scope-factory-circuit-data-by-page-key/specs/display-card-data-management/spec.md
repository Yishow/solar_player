## ADDED Requirements

### Requirement: Factory Circuit card diagnostics are page-scoped
The system SHALL list Factory Circuit card diagnostics separately for each Factory Circuit page instance.

#### Scenario: Operator reviews Factory Circuit card data across sites
- **WHEN** the operator opens the `Card Data Management` tab
- **THEN** the system SHALL list Jungli Factory Circuit rows with `factory-circuit` identity
- **AND** the system SHALL list Guanyin Factory Circuit rows with `factory-circuit-guanyin` identity
- **AND** each Factory Circuit slot row SHALL expose the page-scoped metric key used by that site

##### Example: Same slot name appears as distinct card rows
- **GIVEN** Jungli and Guanyin both have a `stamping` slot
- **WHEN** card diagnostics are generated
- **THEN** Jungli stamping SHALL be identified as `factory-circuit.slot.stamping`
- **AND** Guanyin stamping SHALL be identified as `factory-circuit-guanyin.slot.stamping`
- **AND** the two rows SHALL use distinct metric keys
