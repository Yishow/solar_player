## ADDED Requirements

### Requirement: Replace Factory Circuit load heuristics with explicit slot binding

The system SHALL let `Factory Circuit` bind load rows to explicit display slots instead of inferring them only from circuit icon or name.

#### Scenario: Circuit is assigned to a display slot

- **WHEN** a circuit is bound to a named `Factory Circuit` display slot
- **THEN** the corresponding load row uses that circuit's runtime values
- **AND** unbound slots remain distinguishable from populated ones

### Requirement: Provide alert reasons for Factory Circuit load rows

The system SHALL expose alert reasons for `Factory Circuit` rows when a load enters warning, attention, or missing-data states.

#### Scenario: Load row enters warning state

- **WHEN** a bound circuit exceeds its warning threshold or loses expected data
- **THEN** the `Factory Circuit` story model includes an alert reason for that row
- **AND** the route can present a deterministic status explanation
