## MODIFIED Requirements

### Requirement: Keep fallback policy in shared display page configuration metadata

The system SHALL use page fallback policies to determine whether degraded runtime conditions remain playable, must be skipped, or must trigger a fault or offline experience.

#### Scenario: Live-dependent page exceeds degraded policy

- **WHEN** a live-dependent page has missing runtime inputs beyond what its fallback policy allows
- **THEN** the system moves that page into skip or fault state
- **AND** it does not continue treating placeholder data as healthy playback

##### Example: Factory Circuit exceeds allowed degraded policy

- **GIVEN** `factory-circuit` is configured to tolerate placeholder media but not missing slot bindings
- **WHEN** multiple required slots are unbound
- **THEN** the page exceeds its allowed degraded policy
- **AND** the runtime marks it skipped or faulted instead of continuing as healthy playback
