## ADDED Requirements

### Requirement: Overview display page publication is decoupled from site energy preflight

The publishing preflight system SHALL scope factory energy profile and meter evidence readiness checks strictly to display pages containing factory circuit diagrams and consumption accounting widgets (`factory-circuit` and `factory-circuit-guanyin`). The pure solar-and-weather `overview` page SHALL NOT be blocked by missing, incomplete, or stale factory meter readings.

#### Scenario: Publishing overview without active factory energy profiles
- **WHEN** an operator publishes draft changes for the `overview` display page
- **THEN** preflight validation SHALL NOT require factory site energy profiles to be in `ready` status
- **AND** it SHALL NOT return `ENERGY_PROFILE_INCOMPLETE` blocking findings regardless of factory meter availability or freshness
