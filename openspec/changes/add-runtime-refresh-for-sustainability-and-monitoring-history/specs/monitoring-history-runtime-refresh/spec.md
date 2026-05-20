## ADDED Requirements

### Requirement: Refresh monitoring history pages when persisted history data changes
The system SHALL refresh monitoring history pages when persisted history data changes so `Energy Trend` and `Energy History` remain aligned with newly written snapshots and summaries.

#### Scenario: History pages stay open while new snapshots are persisted
- **GIVEN** `Energy Trend` or `Energy History` is already open on a selected range
- **WHEN** the server persists new metric snapshots or daily summaries and emits a monitoring-history refresh signal
- **THEN** the page SHALL refetch the history data for the current range
- **AND** it SHALL preserve the current range selection while updating the page

##### Example: Week view reloads after a new snapshot write
- **GIVEN** `Energy History` is showing the `week` range
- **WHEN** a new metric snapshot is written and the monitoring-history signal is emitted
- **THEN** the page reloads the `week` history datasets
- **AND** the page keeps the `week` tab active after the refresh
