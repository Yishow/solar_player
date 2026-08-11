## ADDED Requirements

### Requirement: Invalid bulk duration input fails without changing playlist entries

The bulk slideshow-duration mutation SHALL require an explicitly provided finite positive whole-number duration in seconds and SHALL reject invalid input without mutating any playlist entry.

#### Scenario: Duration is missing or not a number

- **WHEN** the bulk-duration request omits `durationSeconds` or provides a non-numeric value
- **THEN** the server SHALL return a bounded 400 response
- **AND** all existing playlist durations SHALL remain unchanged

#### Scenario: Duration is zero, negative, or fractional

- **WHEN** the bulk-duration request provides zero, a negative number, or a fractional number
- **THEN** the server SHALL reject the request
- **AND** it SHALL NOT normalize that invalid value to one second or partially update the playlist
