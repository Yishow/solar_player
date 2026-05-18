## ADDED Requirements

### Requirement: Maintain a first-class rotation plan for display pages

The system SHALL maintain a rotation plan for display pages that includes page order, enabled state, and per-page duration.

#### Scenario: Operator updates display page order

- **WHEN** an operator changes the order or enabled state of display pages in a management surface
- **THEN** the persisted rotation plan reflects that new order and state
- **AND** playback uses the updated plan on the next evaluation cycle

##### Example: Operator moves Images ahead of Sustainability

- **GIVEN** the current rotation order is `overview`, `solar`, `factory-circuit`, `images`, `sustainability`
- **WHEN** the operator moves `images` to position 4 and disables `sustainability`
- **THEN** the persisted rotation plan stores that new order and enabled state
- **AND** the next playback cycle follows the updated sequence

### Requirement: Show rotation plan preview in management workflow

The system SHALL show a rotation plan preview that reflects the currently configured display page order and duration.

#### Scenario: Rotation preview is rendered

- **WHEN** the operator opens playback-related management UI
- **THEN** the UI can show the effective page sequence and stop duration for each playable page

##### Example: Preview shows enabled pages with their configured durations

- **GIVEN** `overview` is configured for `20` seconds and `solar` for `15` seconds
- **WHEN** the operator opens the rotation preview in playback settings
- **THEN** the preview lists `overview` before `solar`
- **AND** each item shows the configured stop duration for that page
