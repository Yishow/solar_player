## MODIFIED Requirements

### Requirement: Store circuit-to-display slot binding explicitly

The system SHALL store circuit-to-display slot binding explicitly for display stories that depend on circuit assignment, and the binding SHALL include the target Factory Circuit page key.

#### Scenario: Circuit is assigned to display slot

- **WHEN** an operator binds a circuit to a display slot in `Circuit Settings`
- **THEN** the binding is persisted explicitly with the circuit page key
- **AND** the display story can resolve that slot for the matching Factory Circuit page without relying only on icon or name heuristics

#### Scenario: Circuits are filtered by Factory Circuit page key

- **WHEN** an operator or client requests circuits for `factory-circuit`
- **THEN** only circuits scoped to `factory-circuit` SHALL be returned
- **WHEN** an operator or client requests circuits for `factory-circuit-guanyin`
- **THEN** only circuits scoped to `factory-circuit-guanyin` SHALL be returned
