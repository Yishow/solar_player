## ADDED Requirements

### Requirement: Overview trend data is limited to the current local day
The system SHALL build the Overview trend profile only from the current local calendar day's monitoring snapshots.

#### Scenario: Current day has trend snapshots
- **WHEN** the current local day has one or more usable monitoring snapshots
- **THEN** the Overview trend selector SHALL build the profile from only those current-day rows
- **AND** it SHALL ignore rows from earlier local days

#### Scenario: Current day has no trend snapshots yet
- **WHEN** the latest available monitoring snapshots all belong to an earlier local day
- **THEN** the Overview trend selector SHALL return an empty trend profile
- **AND** the runtime SHALL NOT fall back to yesterday's curve
