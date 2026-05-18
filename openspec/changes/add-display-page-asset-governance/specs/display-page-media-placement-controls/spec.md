## ADDED Requirements

### Requirement: Provide per-binding media placement controls for display pages

The system SHALL provide media placement controls per display-page media binding, including focal point, fit behavior, and alignment settings.

#### Scenario: Operator adjusts hero placement

- **WHEN** an operator changes the placement controls for a hero or stage image
- **THEN** the editor preview reflects the new crop and alignment
- **AND** the production playback route uses the same placement settings after publish

##### Example: Overview hero image shifts focus to the left

- **GIVEN** the `Overview` hero image is bound to a managed asset
- **WHEN** the operator changes `focusX` from `0.5` to `0.3` with `cover` fit mode
- **THEN** the editor preview shows more content from the left side of the asset
- **AND** publishing preserves that same crop in production playback

### Requirement: Keep media placement controls within safe bounds

The system SHALL validate media placement control values so invalid coordinates or unsupported fit modes do not enter the saved configuration.

#### Scenario: Invalid placement value is submitted

- **WHEN** the client submits out-of-range focal coordinates or an unsupported fit mode
- **THEN** the system rejects or normalizes the invalid values
- **AND** the response explains the placement control issue

##### Example: Client submits an out-of-range focal point

- **GIVEN** a save request sends `focusX = 1.7` for an `Images` main stage binding
- **WHEN** the server validates the placement payload
- **THEN** the invalid focal value is rejected or clamped according to policy
- **AND** the response names the offending field instead of silently accepting it
