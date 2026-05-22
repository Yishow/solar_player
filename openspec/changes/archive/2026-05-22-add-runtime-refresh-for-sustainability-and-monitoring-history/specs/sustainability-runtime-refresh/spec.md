## ADDED Requirements

### Requirement: Refresh Sustainability data when its underlying runtime story changes
The system SHALL refresh Sustainability data when its underlying runtime story changes so long-running sessions do not keep stale sustainability indicators.

#### Scenario: Sustainability session stays open during a story update
- **GIVEN** a Sustainability page is already open on a selected period
- **WHEN** the server emits a sustainability refresh signal after the underlying story data changes
- **THEN** the page SHALL reload the sustainability story for the currently selected period
- **AND** it SHALL preserve the selected period while updating the rendered indicators

##### Example: Lifetime period refreshes in place
- **GIVEN** the page is showing the `lifetime` period
- **WHEN** a sustainability runtime update is emitted
- **THEN** the page refetches the `lifetime` story data
- **AND** the rendered page updates without a full-page reload
