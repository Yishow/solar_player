## ADDED Requirements

### Requirement: Bootstrap governance rows only through an explicit management action
The system SHALL create or backfill persisted image playlist governance rows only through an explicit management bootstrap action.

#### Scenario: Operator chooses to bootstrap playlist governance
- **WHEN** a management operator explicitly triggers playlist governance bootstrap
- **THEN** the server SHALL create any missing governance rows needed for authoring
- **AND** it SHALL emit the existing playlist invalidation events after that mutation

##### Example: Explicit bootstrap creates missing rows
- **GIVEN** image assets exist and some governance rows are missing
- **WHEN** the operator posts to the governance bootstrap action
- **THEN** the server creates the missing rows
- **AND** subsequent governance reads expose those persisted rows for editing
