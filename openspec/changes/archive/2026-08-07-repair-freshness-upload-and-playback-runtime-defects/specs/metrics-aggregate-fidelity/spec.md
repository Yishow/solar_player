## ADDED Requirements

### Requirement: Distinguish a measured zero from an absent aggregate

The system SHALL report a measured aggregate power value of zero as the number `0`, and SHALL report `null` only when no observation source is available for that aggregate.

#### Scenario: All contributing circuits report zero power

- **WHEN** the live metrics snapshot contains contributing power readings whose values sum to zero
- **THEN** the aggregate snapshot SHALL report the consumption power as `0`
- **AND** it SHALL NOT report `null`

#### Scenario: No observation source is available

- **WHEN** the aggregate is built without any live metrics observation
- **THEN** the aggregate snapshot SHALL report the consumption power as `null`

##### Example: zero versus absent

| Contributing readings | Reported consumption power | Notes |
| --------------------- | -------------------------- | ----- |
| 0 kW, 0 kW | 0 | measured zero, plant idle |
| 12 kW, 8 kW | 20 | normal case |
| (no observation) | null | source unavailable |

### Requirement: Match power units without case sensitivity

The system SHALL treat power unit labels as case-insensitive when selecting readings for aggregation, so that readings are not silently excluded because of unit letter casing.

#### Scenario: Mixed-case unit labels contribute to the aggregate

- **WHEN** contributing readings carry power unit labels that differ only in letter casing
- **THEN** every such reading SHALL be included in the aggregate sum

##### Example: casing variants

| Unit label on reading | Included in aggregate |
| --------------------- | --------------------- |
| kW | yes |
| kw | yes |
| KW | yes |
| kWh | no — not a power unit |
