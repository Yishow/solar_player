## ADDED Requirements

### Requirement: Set every Images playlist entry duration in one action

The system SHALL provide a bulk operation that sets the per-entry playback duration of every Images playlist entry to one provided value, applying a floor of 1 second. The operation SHALL leave every other entry field (display order, enabled state, title, and metadata) unchanged, and SHALL emit the existing images-updated and display-sync notifications.

#### Scenario: Bulk duration applies to all entries

- **WHEN** an operator sets all Images playlist durations to a provided value of at least 1 second
- **THEN** every Images playlist entry's duration SHALL equal that value
- **AND** each entry's display order, enabled state, and metadata SHALL be unchanged
- **AND** the system SHALL emit the images-updated and display-sync notifications

##### Example: setting all to 8 seconds

- **GIVEN** three Images playlist entries with durations 10, 15, and 5 seconds
- **WHEN** all durations are set to 8 seconds
- **THEN** all three entries SHALL have a duration of 8 seconds

#### Scenario: Bulk duration is floored at 1 second

- **WHEN** an operator sets all Images playlist durations to a value below 1 second
- **THEN** every entry's duration SHALL be set to 1 second
