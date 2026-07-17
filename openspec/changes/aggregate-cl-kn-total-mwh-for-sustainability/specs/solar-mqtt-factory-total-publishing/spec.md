## ADDED Requirements

### Requirement: Publish factory cumulative generation from a complete zone snapshot

The field MQTT publisher SHALL calculate each factory's cumulative generation as the sum of every zone's finite `total_mwh` from the same scrape cycle and SHALL publish the result in both the factory summary and a retained scalar topic.

#### Scenario: All zone totals are valid

- **WHEN** a factory scrape returns a non-empty zone list and every zone has a finite `total_mwh`
- **THEN** the publisher SHALL set `summary.total_mwh` to the rounded sum of those zone values
- **AND** it SHALL publish retained `solar/{factory}/total_mwh` with JSON payload `{ "value": <sum> }`
- **AND** the existing per-zone topics SHALL remain unchanged

##### Example: CL and KN factory sums

| Factory | Zone totals in MWh | Factory total in MWh |
| --- | --- | --- |
| CL | 5587.416, 4398.890, 0, 0, 0 | 9986.306 |
| KN | 628.070, 3031.500 | 3659.570 |

### Requirement: Preserve the last retained factory total when zone data is incomplete

The field MQTT publisher SHALL NOT publish a new factory scalar `total_mwh` when any current zone total is missing or non-finite, and it SHALL emit a bounded alert identifying the incomplete factory and zone ids.

#### Scenario: One zone total is missing

- **WHEN** at least one current zone has `total_mwh` equal to null, NaN, Infinity, or a missing value
- **THEN** the publisher SHALL omit `total_mwh` from that cycle's factory summary
- **AND** it SHALL skip publishing the factory scalar `total_mwh`
- **AND** the broker SHALL retain the previous valid scalar value
- **AND** the publisher SHALL emit a bounded incomplete-total alert

#### Scenario: A previously known zone disappears

- **WHEN** a factory's current scrape omits a zone id that was present in its last successful complete zone set
- **THEN** the publisher SHALL treat the current factory total as incomplete
- **AND** it SHALL preserve the previous retained scalar total

##### Example: CL zone 2 disappears

- **GIVEN** the last complete CL zone set is `1, 2, 3, 4, 5` and retained factory total is 9986.306 MWh
- **WHEN** the next scrape contains only zones `1, 3, 4, 5`
- **THEN** the publisher omits factory `total_mwh`, skips the scalar publish, and identifies missing zone `2`
