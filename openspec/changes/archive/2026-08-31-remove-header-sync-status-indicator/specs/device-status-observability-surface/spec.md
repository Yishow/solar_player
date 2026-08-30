## MODIFIED Requirements

### Requirement: Present device status as a summary-first observability dashboard

The system SHALL present `Device Status` as a summary-first observability dashboard. It SHALL align with standard management surface positioning without overlapping the page title, SHALL support internal vertical scrolling within the info region, and SHALL expose Server Authoritative App Time and Time Sync Status within the Device Information section.

#### Scenario: Operator opens device status during an incident

- **WHEN** the operator opens `Device Status` during a degraded runtime incident
- **THEN** the page SHALL surface host health, display-operations health, and next-action guidance before deep detail sections
- **AND** the top of main content panels SHALL NOT overlap the page title

#### Scenario: Operator inspects server time and sync status

- **WHEN** the operator views the Device Information section in `Device Status`
- **THEN** it SHALL display the formatted Server Authoritative Time
- **AND** it SHALL display the current Time Sync Status indicator
