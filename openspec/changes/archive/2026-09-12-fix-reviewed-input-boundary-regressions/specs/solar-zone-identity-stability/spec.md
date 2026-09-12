## MODIFIED Requirements

### Requirement: Corrupt identity state fails explicitly instead of silently renumbering

An existing identity sidecar with invalid JSON, unsupported version, invalid identity keys, non-positive ids, duplicate identity keys, or one numeric id bound to multiple identity keys SHALL be rejected. The collector SHALL NOT delete or reset the state and continue from 1.

Identity keys SHALL use exactly `serial:<non-empty trimmed serial>` or `position:<canonical positive decimal integer>`. Noncanonical keys SHALL be rejected without changing the sidecar bytes; the collector SHALL NOT silently normalize keys, merge identities, or allocate replacement aliases.

#### Scenario: Existing sidecar contains collision

- **WHEN** a factory sidecar binds two identity keys to the same numeric zone id
- **THEN** startup or identity preparation fails with an observable identity-state error
- **AND** no automatic renumbering is performed

#### Scenario: Noncanonical serial key is rejected without renumbering

- **GIVEN** KN sidecar binds `serial: A ` to zone 7 and next_zone_id is 8
- **WHEN** the collector loads that sidecar
- **THEN** loading SHALL fail with an observable identity-state error
- **AND** the sidecar bytes SHALL remain unchanged and no replacement zone 8 SHALL be returned

#### Scenario: Noncanonical position or normalized duplicate keys are rejected

- **WHEN** the sidecar contains `position:01`, `position:+1`, or both `serial:A` and `serial: A `
- **THEN** loading SHALL fail without modifying the file or returning a canonical identity resolver
