## ADDED Requirements

### Requirement: Store circuit-to-display slot binding explicitly

The system SHALL store circuit-to-display slot binding explicitly for display stories that depend on circuit assignment.

#### Scenario: Circuit is assigned to display slot

- **WHEN** an operator binds a circuit to a display slot in `Circuit Settings`
- **THEN** the binding is persisted explicitly
- **AND** the display story can resolve that slot without relying only on icon or name heuristics

### Requirement: Surface unbound or conflicting display slot assignments in Circuit Settings

The system SHALL surface unbound or conflicting display slot assignments in `Circuit Settings`.

#### Scenario: Two circuits claim the same display slot

- **WHEN** the settings create a conflicting slot assignment
- **THEN** `Circuit Settings` surfaces that conflict as a readiness finding
- **AND** the operator can identify the affected display slot
