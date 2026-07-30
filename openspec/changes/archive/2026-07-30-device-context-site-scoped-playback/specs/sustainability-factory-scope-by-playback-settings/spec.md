## ADDED Requirements

### Requirement: Device-scoped Sustainability uses the Context Site Scope

For an authenticated Display Client Context, Sustainability aggregation SHALL use the Context Site Scope and SHALL NOT infer factory scope from global Factory Circuit page enablement.

#### Scenario: CL and KN Devices request Sustainability concurrently

- **WHEN** paired CL and KN Devices request Sustainability while both factory pages are globally enabled
- **THEN** the CL response contains only CL source values
- **AND** the KN response contains only KN source values
