## MODIFIED Requirements

### Requirement: Evaluate display readiness checks from MQTT and circuit configuration

The system SHALL make blocking display readiness findings actionable in playback eligibility, not only visible in management diagnostics.

#### Scenario: Blocking readiness finding removes page from healthy rotation

- **WHEN** a required topic mapping or slot binding is missing for a display page
- **THEN** the readiness report marks that page blocking
- **AND** rotation or fault-policy evaluation consumes that blocking state when determining whether the page is eligible to play

##### Example: Missing Solar mapping blocks effective playback

- **GIVEN** the `solar` page still appears in the configured rotation plan
- **WHEN** the required `systemEfficiency` mapping is missing
- **THEN** readiness marks `solar` as blocking
- **AND** the effective playback evaluation skips or faults `solar` according to policy
