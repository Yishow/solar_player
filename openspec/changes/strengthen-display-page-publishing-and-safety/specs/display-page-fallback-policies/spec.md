## ADDED Requirements

### Requirement: Keep fallback policy in shared display page configuration metadata

The system SHALL define fallback policy as part of the shared display page configuration metadata so runtime routes and management surfaces evaluate degraded states consistently.

#### Scenario: Live runtime encounters missing asset or stale data

- **WHEN** a live display page cannot resolve a required asset or receives stale source data
- **THEN** the runtime applies the configured fallback policy for that page
- **AND** the route continues rendering a valid playback surface

##### Example: Sustainability hero falls back after asset lookup fails

- **GIVEN** the live `Sustainability` page references a hero asset that has been removed from storage
- **WHEN** the runtime resolves that page for playback
- **THEN** the configured fallback hero or seed-backed media is used
- **AND** the rest of the page keeps rendering instead of showing a broken image

### Requirement: Expose fallback policy status to management surfaces

The system SHALL expose the effective fallback policy and its triggered state to management surfaces that inspect display page readiness or publishing status.

#### Scenario: Management surface reads active fallback state

- **WHEN** a management route loads display page publishing or readiness information
- **THEN** it can distinguish normal live rendering from fallback-driven live rendering
- **AND** it can show which fallback policy was applied

##### Example: Editor shows that Overview is currently in stale-data fallback

- **GIVEN** the live `Overview` summary is rendering from stale metric fallback
- **WHEN** the operator opens a management surface that reads display page status
- **THEN** the page reports that `overview` is using fallback mode
- **AND** the UI can name the active fallback policy instead of marking the page healthy
