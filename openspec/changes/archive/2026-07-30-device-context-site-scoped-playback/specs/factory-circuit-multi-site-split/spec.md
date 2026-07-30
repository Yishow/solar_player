## ADDED Requirements

### Requirement: Device-scoped Factory Circuit routing overrides global playback enablement

For an authenticated Display Client Context, Factory Circuit page selection, story data, slot keys, and metric keys SHALL derive from the Context Site Scope. Global playback page enablement SHALL NOT select the Client Site.

#### Scenario: KN Device requests the Factory Circuit Story

- **WHEN** a paired Device in a kn Group requests its Factory Circuit Story
- **THEN** the response contains the KN page identity and KN slot/data bindings
- **AND** no CL-only department or metric is present
