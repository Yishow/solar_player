## MODIFIED Requirements

### Requirement: Maintain a first-class display page registry

The system SHALL maintain a first-class display page registry that distinguishes supported template kinds from persisted page instances while keeping playback membership state in the Default Playback Profile.

#### Scenario: Operator creates a second page from an existing template

- **WHEN** an operator creates a new display page instance using a supported template kind
- **THEN** the registry stores a distinct page identity with its own route slug, display name, and archive metadata
- **AND** the Default Playback Profile stores the page's enabled state, display order, and duration
- **AND** the page does not overwrite the original built-in instance

##### Example: Add a second Images page

- **GIVEN** the system already has a built-in `images` page instance
- **WHEN** the operator creates another page instance from the `images` template
- **THEN** the registry persists two separate page identities
- **AND** the Default Playback Profile contains an independent membership for each page
- **AND** playback and editor can address them independently
