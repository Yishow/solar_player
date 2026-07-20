## ADDED Requirements

### Requirement: Maintain a first-class display page registry

The system SHALL maintain a first-class display page registry that distinguishes supported template kinds from persisted page instances.

#### Scenario: Operator creates a second page from an existing template

- **WHEN** an operator creates a new display page instance using a supported template kind
- **THEN** the registry stores a distinct page instance with its own route slug, display name, order, and enabled state
- **AND** the page does not overwrite the original built-in instance

##### Example: Add a second Images page

- **GIVEN** the system already has a built-in `images` page instance
- **WHEN** the operator creates another page instance from the `images` template
- **THEN** the registry persists two separate page instances
- **AND** playback and editor can address them independently

### Requirement: Resolve playback and editing from registry instances

The implementation SHALL drive playback rotation and display-page editing from registry instances instead of a hard-coded five-page array.

#### Scenario: Archived page leaves the active rotation

- **WHEN** a page instance is archived or disabled in the registry
- **THEN** playback rotation excludes that page from future evaluation
- **AND** the editor no longer shows it as an active editable tab

##### Example: Archive a duplicate Sustainability page

- **GIVEN** a duplicate `sustainability` page instance exists in the registry
- **WHEN** the operator archives that instance
- **THEN** the remaining active pages continue to play normally
- **AND** the archived instance is not treated as one of the required active tabs
