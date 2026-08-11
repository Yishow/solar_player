## ADDED Requirements

### Requirement: Circuit threshold mutations preserve an ordered non-negative range model

Circuit create and update operations SHALL validate the complete effective threshold candidate before persistence. Rated capacity and all threshold values SHALL be finite and non-negative, and the effective candidate SHALL satisfy `normalMin <= normalMax <= attentionMin <= attentionMax <= warningMin <= warningMax <= ratedCapacity`.

#### Scenario: New circuit contains an invalid range

- **WHEN** an operator creates a circuit with a negative value or an out-of-order threshold range
- **THEN** the server SHALL reject the mutation with a bounded 400 validation response
- **AND** no circuit row SHALL be created
- **AND** no successful circuit-settings sync event SHALL be emitted

#### Scenario: Partial update becomes invalid only after merging with stored values

- **GIVEN** an existing circuit has a valid ordered threshold configuration
- **WHEN** a partial update changes one field such that the merged candidate violates the ordering invariant
- **THEN** the server SHALL reject the update
- **AND** the stored circuit configuration SHALL remain unchanged

#### Scenario: Adjacent thresholds share a boundary

- **WHEN** a valid circuit configuration uses equal adjacent boundaries such as `normalMax == attentionMin`
- **THEN** the configuration SHALL be accepted as ordered
