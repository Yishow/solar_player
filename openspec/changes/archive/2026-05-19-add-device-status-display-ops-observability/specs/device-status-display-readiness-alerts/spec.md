## ADDED Requirements

### Requirement: Show display readiness and skip alerts in Device Status

The system SHALL show display readiness and skip alerts in `Device Status`.

#### Scenario: A display page is skipped or not ready

- **WHEN** a display page is currently skipped or blocked by readiness issues
- **THEN** `Device Status` surfaces that alert in its display-operations area
- **AND** the alert remains understandable without opening another management page

### Requirement: Include asset-health style findings in Device Status alerts

The system SHALL include asset-health style findings in Device Status alerts when they affect production playback.

#### Scenario: Live display depends on unhealthy asset

- **WHEN** a production display page depends on an unhealthy or missing asset
- **THEN** `Device Status` includes that finding in the display alert summary
- **AND** the finding identifies the affected display path or story area
