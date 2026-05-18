## ADDED Requirements

### Requirement: Provide draft and live publishing channels for display page configuration

The system SHALL store display page configuration in separate `draft` and `live` channels so operators can edit pending changes without affecting the production playback routes.

#### Scenario: Editor saves a draft change

- **GIVEN** an operator is editing `Overview` in the display page editor
- **WHEN** the operator saves the current configuration without publishing it
- **THEN** the configuration is stored in the `draft` channel for that page
- **AND** the production playback route continues using the current `live` configuration

### Requirement: Support publish history and rollback for live display page configuration

The system SHALL create a new live version when a draft is published and SHALL allow operators to roll the live channel back to an earlier published version.

#### Scenario: A draft is published to live

- **WHEN** an operator publishes a validated draft configuration for a display page
- **THEN** the system records a new live version with publish metadata
- **AND** the production playback route uses that new live version

##### Example: Overview hero draft becomes the next live version

- **GIVEN** the `Overview` draft changes `heroCopyLayout.left` from `86` to `120`
- **WHEN** the operator publishes that validated draft
- **THEN** the system creates a new `live` version for `overview`
- **AND** the production `/overview` route starts rendering the hero copy at `120`

#### Scenario: An operator rolls back a live version

- **GIVEN** a display page has at least one earlier published version
- **WHEN** an operator requests rollback to that earlier version
- **THEN** the system restores that version as the active live configuration
- **AND** the rollback is visible in the publish history
