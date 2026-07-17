## ADDED Requirements

### Requirement: Resolve Sustainability factory scope from playback page enablement

The system SHALL keep one Sustainability playback page and SHALL resolve its factory scope from the enabled state of the existing CL and KN Factory Circuit playback pages. The system SHALL NOT add a separate Sustainability factory selector.

#### Scenario: Only the CL factory page is enabled

- **WHEN** `factory-circuit` is enabled and `factory-circuit-guanyin` is disabled in playback settings
- **THEN** Sustainability SHALL use the CL factory scope
- **AND** every generation-derived Sustainability value and source state SHALL exclude KN

#### Scenario: Only the KN factory page is enabled

- **WHEN** `factory-circuit` is disabled and `factory-circuit-guanyin` is enabled in playback settings
- **THEN** Sustainability SHALL use the KN factory scope
- **AND** every generation-derived Sustainability value and source state SHALL exclude CL

#### Scenario: Both factory pages are enabled

- **WHEN** `factory-circuit` and `factory-circuit-guanyin` are both enabled in playback settings
- **THEN** Sustainability SHALL use the CL plus KN scope
- **AND** every generation-derived Sustainability value SHALL use the complete two-factory aggregate

#### Scenario: Neither factory page is enabled

- **WHEN** `factory-circuit` and `factory-circuit-guanyin` are both disabled in playback settings
- **THEN** Sustainability SHALL expose an explicit no-factory-selected state
- **AND** generation-derived values SHALL use the existing unavailable/`--` presentation
- **AND** the system SHALL NOT silently fall back to CL, KN, or CL plus KN

### Requirement: Refresh Sustainability when playback factory enablement changes

The system SHALL apply the current playback factory enablement whenever it builds or refreshes the Sustainability story so that factory scope does not require a second persisted setting.

#### Scenario: Operator changes from CL-only to both factories

- **WHEN** the operator enables `factory-circuit-guanyin` while `factory-circuit` remains enabled and saves playback settings
- **THEN** the next Sustainability refresh SHALL change its scope from CL to CL plus KN
- **AND** the route SHALL remain the single `/sustainability` page
