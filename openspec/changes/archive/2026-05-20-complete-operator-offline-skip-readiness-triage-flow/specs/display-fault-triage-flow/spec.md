## ADDED Requirements

### Requirement: Surface a shared triage path for offline, skip, and readiness faults

The system SHALL surface a shared triage path for offline, skip, and readiness faults across the operator-facing fault surfaces.

#### Scenario: Operator sees a skipped page caused by a blocking dependency

- **WHEN** a display page is skipped because of a readiness, stale-runtime, or unpublished fault
- **THEN** the operator-facing fault surface SHALL name the affected page and the dominant fault reason
- **AND** it SHALL identify the next management surface that best matches the repair action

##### Example: MQTT fault points to the correct repair surface

- **GIVEN** `overview` is skipped because a required MQTT mapping is missing
- **WHEN** the operator opens `Offline Error`, `Device Status`, or `Playback Settings`
- **THEN** the fault summary identifies `overview` as affected
- **AND** the triage guidance points to `MQTT Settings` as the next repair surface

### Requirement: Keep fault triage semantics consistent across management surfaces

The system SHALL keep fault triage semantics consistent across `Offline Error`, `Device Status`, and `Playback Settings`.

#### Scenario: Same fault appears in multiple surfaces

- **WHEN** the same display fault is rendered by multiple management surfaces
- **THEN** each surface SHALL preserve the same dominant reason and affected-page semantics
- **AND** the operator SHALL NOT need to infer a different root cause from each page

##### Example: Unpublished page fault stays consistent across surfaces

- **GIVEN** `factory-circuit` is skipped because its latest draft has not been published
- **WHEN** the operator reviews `Offline Error`, `Device Status`, and `Playback Settings`
- **THEN** each surface names the unpublished state as the dominant reason for `factory-circuit`
- **AND** none of the surfaces imply a different root cause such as device offline or stale MQTT data
